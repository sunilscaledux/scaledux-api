import { prisma } from "@services/prismaService";
import { PaymentMethodInput, TaxInformationInput, RazorpayVerificationInput } from "./BillingType";
import crypto from "crypto";
import Razorpay from "razorpay";
import razorpayConfig from "@config/razorpay";
import { convertToUserCurrency } from "@utils/currencyConverter";

// Initialize Razorpay (only if keys are provided)
let razorpay: any = null;
if (razorpayConfig.key_id && razorpayConfig.key_secret) {
    razorpay = new Razorpay({
        key_id: razorpayConfig.key_id,
        key_secret: razorpayConfig.key_secret
    });
}

export class BillingService {
  // Create Razorpay order for card verification (charge small amount)
  static async createVerificationOrder(userId: string, amount: number = 1) {
    console.log(razorpayConfig);
    if (!razorpay) {
      return {
        success: false,
        message: 'Razorpay is not configured. Please add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to your .env file'
      };
    }

    try {
      const order = await razorpay.orders.create({
        amount: amount * 100, // Amount in paise (1 INR = 100 paise)
        currency: 'INR',
        receipt: `verify_${userId}_${Date.now()}`,
        notes: {
          purpose: 'card_verification',
          user_id: userId
        }
      });

      return {
        success: true,
        data: {
          orderId: order.id,
          amount: order.amount,
          currency: order.currency,
          keyId: process.env.RAZORPAY_KEY_ID
        }
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to create verification order'
      };
    }
  }

  // Verify Razorpay payment signature
  static verifyPaymentSignature(data: RazorpayVerificationInput): boolean {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = data;
    const secret = razorpayConfig.key_secret || '';
    
    const generatedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');
    
    return generatedSignature === razorpaySignature;
  }

  // Create or get Razorpay customer
  static async createOrGetCustomer(userId: string, email: string, contact: string, name: string) {
    if (!razorpay) {
      return null;
    }

    try {
      // Create a new customer in Razorpay
      const customer = await razorpay.customers.create({
        name: name,
        email: email,
        contact: contact,
        notes: {
          user_id: userId
        }
      });

      return customer.id;
    } catch (error: any) {
      console.error('Error creating Razorpay customer:', error);
      return null;
    }
  }

  // Fetch card details and token from Razorpay Payment API
  static async fetchPaymentDetails(razorpayPaymentId: string) {
    if (!razorpay) {
      return null;
    }

    try {
      const payment = await razorpay.payments.fetch(razorpayPaymentId);
      
      return {
        cardBrand: payment.card?.network || payment.method,
        lastFourDigits: payment.card?.last4 || '0000',
        cardHolderName: payment.card?.name || payment.email || 'Card Holder',
        expiryMonth: payment.card?.expiry_month || null,
        expiryYear: payment.card?.expiry_year || null,
        cardToken: payment.card_id || payment.token || null, // Card token for future charges
        customerId: payment.customer_id || null,
        email: payment.email,
        contact: payment.contact
      };
    } catch (error) {
      console.error('Error fetching payment details:', error);
      return null;
    }
  }

  /**
   * Fetch Razorpay payment and return a flat Record for transaction meta (JSON column).
   * Stores: payment_id, order_id, method, status, bank, card_last4, card_network, bank_transaction_id (if any), etc.
   */
  static async fetchRazorpayPaymentMeta(razorpayPaymentId: string, razorpayOrderId?: string): Promise<Record<string, string>> {
    if (!razorpay || !razorpayPaymentId) return {};
    const set = (m: Record<string, string>, k: string, v: unknown) => {
      if (v != null && String(v).trim() !== '') m[k] = String(v).trim();
    };
    try {
      const payment = await razorpay.payments.fetch(razorpayPaymentId) as any;
      const meta: Record<string, string> = {};
      set(meta, 'razorpay_payment_id', payment?.id ?? razorpayPaymentId);
      set(meta, 'razorpay_order_id', payment?.order_id ?? razorpayOrderId);
      set(meta, 'razorpay_method', payment?.method);
      set(meta, 'razorpay_status', payment?.status);
      set(meta, 'razorpay_bank', payment?.bank);
      set(meta, 'razorpay_card_last4', payment?.card?.last4);
      set(meta, 'razorpay_card_network', payment?.card?.network);
      set(meta, 'razorpay_vpa', payment?.vpa);
      const acquirerData = payment?.acquirer_data;
      if (acquirerData && typeof acquirerData === 'object') {
        const bankRef = acquirerData.bank_transaction_id ?? acquirerData.utr ?? acquirerData.rrn;
        set(meta, 'razorpay_bank_transaction_id', bankRef);
        set(meta, 'razorpay_auth_code', acquirerData.auth_code);
      }
      return meta;
    } catch (error) {
      console.error('Error fetching Razorpay payment for meta:', error);
      const fallback: Record<string, string> = { razorpay_payment_id: razorpayPaymentId };
      set(fallback, 'razorpay_order_id', razorpayOrderId);
      return fallback;
    }
  }

  // Charge a saved card for future payments
  static async chargeSavedCard(paymentMethodId: string, amount: number, description: string) {
    if (!razorpay) {
      return {
        success: false,
        message: 'Razorpay is not configured'
      };
    }

    try {
      // Get payment method from database
      const paymentMethod = await prisma.paymentMethod.findUnique({
        where: { id: parseInt(paymentMethodId) }
      });

      if (!paymentMethod || !paymentMethod.card_token) {
        return {
          success: false,
          message: 'Payment method not found or card token missing'
        };
      }

      // Create payment using saved card token
      const payment = await razorpay.payments.create({
        amount: amount * 100, // Convert to paise
        currency: 'INR',
        customer_id: paymentMethod.razorpay_customer_id,
        token: paymentMethod.card_token,
        description: description,
        capture: true // Auto-capture payment
      });

      return {
        success: true,
        data: {
          paymentId: payment.id,
          amount: payment.amount / 100,
          status: payment.status
        }
      };
    } catch (error: any) {
      console.error('Error charging saved card:', error);
      return {
        success: false,
        message: error.message || 'Failed to charge saved card'
      };
    }
  }

  // Save payment method after Razorpay verification
  static async savePaymentMethod(userId: string, data: PaymentMethodInput) {
    const userIdNum = parseInt(userId);
    
    // Check if this is the first payment method for the user
    const existingMethods = await prisma.paymentMethod.count({
      where: { user_id: userIdNum }
    });
    
    const isFirstCard = existingMethods === 0;
    
    // If setting as default OR if this is the first card, unset other default payment methods
    if (data.isDefault || isFirstCard) {
      await prisma.paymentMethod.updateMany({
        where: { user_id: userIdNum },
        data: { is_default: false }
      });
    }

    let paymentMethod;

    if (data.paymentType === 'card') {
      // Handle card payment method with Razorpay
      paymentMethod = await prisma.paymentMethod.create({
        data: {
          user_id: userIdNum,
          payment_type: 'card',
          razorpay_customer_id: data.razorpayCustomerId,
          razorpay_payment_id: data.razorpayPaymentId,
          card_token: data.cardToken || null, // Save card token for future charges
          card_brand: data.cardBrand,
          last_four_digits: data.lastFourDigits,
          card_holder_name: data.cardHolderName,
          expiry_month: data.expiryMonth,
          expiry_year: data.expiryYear,
          is_verified: true,
          verification_amount: data.verificationAmount,
          verified_at: new Date(),
          is_default: data.isDefault || isFirstCard // First card is always default
        }
      });

      return {
        success: true,
        message: "Card payment method verified and saved successfully",
        data: {
          id: paymentMethod.id,
          paymentType: 'card',
          cardBrand: paymentMethod.card_brand,
          lastFourDigits: paymentMethod.last_four_digits,
          cardHolderName: paymentMethod.card_holder_name,
          expiryMonth: paymentMethod.expiry_month,
          expiryYear: paymentMethod.expiry_year,
          isVerified: paymentMethod.is_verified,
          isDefault: paymentMethod.is_default
        }
      };
    } else {
      // Handle PayPal payment method with Razorpay
      paymentMethod = await prisma.paymentMethod.create({
        data: {
          user_id: userIdNum,
          payment_type: 'paypal',
          razorpay_customer_id: data.razorpayCustomerId,
          razorpay_payment_id: data.razorpayPaymentId,
          paypal_email: data.paypalEmail,
          paypal_payer_id: data.paypalPayerId || null,
          is_verified: true,
          verified_at: new Date(),
          is_default: data.isDefault || false
        }
      });

      return {
        success: true,
        message: "PayPal payment method verified and saved successfully",
        data: {
          id: paymentMethod.id,
          paymentType: 'paypal',
          paypalEmail: paymentMethod.paypal_email,
          paypalPayerId: paymentMethod.paypal_payer_id,
          isVerified: paymentMethod.is_verified,
          isDefault: paymentMethod.is_default
        }
      };
    }
  }

  /**
   * Update user billing totals after a transaction. Call after every billing transaction create.
   * Amount is in the same unit as BillingTransaction.amount (base currency).
   * receiverAmount = credit to total_earning (and wallet if receiverWalletAmount not set).
   * receiverWalletAmount = optional separate wallet credit (e.g. full amount before service_fee debit).
   */
  private static async updateUserBillingTotalsAfterTransaction(
    type: 'payment' | 'refund' | 'withdrawal',
    status: string,
    fromId: number,
    toId: number,
    amount: number,
    receiverAmount?: number,
    receiverWalletAmount?: number
  ) {
    const amt = Number(amount);
    const toAmt = receiverAmount !== undefined ? Number(receiverAmount) : amt;
    const toWalletAmt = receiverWalletAmount !== undefined ? Number(receiverWalletAmount) : toAmt;
    if (type === 'payment' || type === 'refund') {
      if (status !== 'completed') return;
      // Receiver (to_id) gains total_earning and wallet; sender (from_id) wallet is not changed on release (already debited when funding)
      if (toId > 0) {
        await prisma.user.update({
          where: { id: toId },
          data: {
            total_earning: { increment: toAmt },
            wallet_amount: { increment: toWalletAmt },
          },
        });
      }
    } else if (type === 'withdrawal') {
      if (fromId > 0) {
        if (status === 'pending') {
          await prisma.user.update({
            where: { id: fromId },
            data: { wallet_amount: { decrement: amt } },
          });
        } else if (status === 'completed') {
          await prisma.user.update({
            where: { id: fromId },
            data: { total_withdrawal: { increment: amt } },
          });
        }
      }
    }
  }

  /**
   * Record a payment: one billing row (from payer to payee). subject_type and subject_id are on the row.
   * For proposal/milestone payments use status: 'pending' (released later via releasePaymentTransaction).
   * User totals are updated only when status is 'completed'.
   */
  static async recordPayment(params: {
    actorId: number;
    fromId: number;
    toId: number;
    subjectType: string;
    subjectId: number;
    amount: number;
    description: string;
    meta?: Record<string, string>;
    status?: 'pending' | 'completed';
    milestoneId?: number | null;
  }) {
    const { actorId, fromId, toId, subjectType, subjectId, amount, description, meta, status = 'completed', milestoneId } = params;
    const currencyId = 1;

    const row = await (prisma as any).billingTransaction.create({
      data: {
        actor_type: 'User',
        actor_id: actorId,
        from_type: 'User',
        from_id: fromId,
        to_type: 'User',
        to_id: toId,
        subject_type: subjectType,
        subject_id: subjectId,
        milestone_id: milestoneId ?? undefined,
        amount,
        currency_id: currencyId,
        type: 'payment',
        status,
        sender_status: status,
        receiver_status: status,
        description,
        meta: meta ? (meta as object) : undefined
      }
    });
    if (status === 'completed') {
      await this.updateUserBillingTotalsAfterTransaction('payment', 'completed', fromId, toId, amount);
    } else if (status === 'pending' && toId > 0) {
      // Founder funded milestone: add full amount to freelancer's pending (to be received)
      await prisma.user.update({
        where: { id: toId },
        data: { pending_amount: { increment: Number(amount) } },
      });
    }

    return { success: true, data: { transactionId: row.id, transactionUniqueId: row.unique_id } };
  }

  /**
   * Release a pending payment (founder only). Sets transaction to completed and credits freelancer (to_id) with net amount only.
   * Founder (from_id) wallet is not changed on release. Platform fee (SERVICE_FEE_PERCENT) is deducted from the freelancer.
   */
  static async releasePaymentTransaction(transactionUniqueId: string, userId: number): Promise<{ success: boolean; message?: string }> {
    const tx = await prisma.billingTransaction.findUnique({
      where: { unique_id: transactionUniqueId }
    });
    if (!tx) return { success: false, message: 'Transaction not found' };
    if (tx.type !== 'payment') return { success: false, message: 'Not a payment transaction' };
    if (tx.status !== 'pending') return { success: false, message: 'Payment is already completed or not pending' };
    if (tx.from_id !== userId) return { success: false, message: 'Only the payer can release this payment' };

    await (prisma as any).billingTransaction.update({
      where: { id: tx.id },
      data: { status: 'completed', sender_status: 'completed', receiver_status: 'completed' }
    });
    const amount = Number(tx.amount);
    const feePercent = Math.min(100, Math.max(0, Number(process.env.SERVICE_FEE_PERCENT) || 10));
    const netAmount = Math.round(amount * (1 - feePercent / 100) * 100) / 100;
    const feeAmount = Math.round((amount - netAmount) * 100) / 100;
    
    // Remove full amount from freelancer's pending (was added when founder funded)
    if (tx.to_id > 0) {
      await prisma.user.update({
        where: { id: tx.to_id },
        data: { pending_amount: { decrement: amount } },
      });
    }
    // Credit freelancer: total_earning += net, wallet += full; service_fee row will debit wallet by fee
    await this.updateUserBillingTotalsAfterTransaction('payment', 'completed', tx.from_id, tx.to_id, amount, netAmount, amount);

    const milestoneId = (tx as any).milestone_id as number | null | undefined;

    // Record service charge: billing row + reduce freelancer wallet + update milestone.service_fee_amount
    if (feeAmount > 0) {
      await (prisma as any).billingTransaction.create({
        data: {
          actor_type: 'User',
          actor_id: userId,
          from_type: 'User',
          from_id: tx.to_id,
          to_type: 'Platform',
          to_id: 0,
          subject_type: tx.subject_type,
          subject_id: tx.subject_id,
          milestone_id: milestoneId ?? undefined,
          amount: feeAmount,
          currency_id: tx.currency_id,
          type: 'service_fee',
          status: 'completed',
          sender_status: 'completed',
          receiver_status: 'completed',
          description: `Platform service fee (${feePercent}%)`,
          meta: { source_transaction_unique_id: tx.unique_id, fee_percent: feePercent }
        }
      });
      if (tx.to_id > 0) {
        await prisma.user.update({
          where: { id: tx.to_id },
          data: { wallet_amount: { decrement: feeAmount } },
        });
      }
      if (milestoneId != null) {
        await (prisma as any).milestone.updateMany({
          where: { id: milestoneId },
          data: { service_fee_amount: feeAmount }
        });
      }
    }

    // Sync release payment to chat (founder + freelancer); same for both milestone flow and direct billing release
    if (tx.subject_type === 'Proposal' && tx.subject_id != null && tx.from_id > 0 && tx.to_id > 0) {
      let proposal: any = null;
      let milestoneTitle = '';
      if (milestoneId != null) {
        const milestone = await (prisma as any).milestone.findUnique({
          where: { id: milestoneId },
          include: { proposal: { include: { project: { select: { id: true, project_title: true } } } } }
        });
        if (milestone) {
          proposal = milestone.proposal;
          milestoneTitle = milestone.title ?? milestone.description ?? `Milestone`;
        }
      }
      if (!proposal) {
        proposal = await (prisma as any).proposal.findFirst({
          where: { id: tx.subject_id },
          include: { project: { select: { id: true, project_title: true } } }
        });
        const metaObj = (tx as any).meta as Record<string, unknown> | null;
        const milestoneIndexMeta = metaObj?.milestone_index != null ? parseInt(String(metaObj.milestone_index), 10) : 0;
        const milestones = await (prisma as any).milestone.findMany({
          where: { proposal_id: tx.subject_id },
          orderBy: { order_index: 'asc' }
        });
        const row = milestones[milestoneIndexMeta];
        milestoneTitle = row?.title ?? row?.description ?? `Milestone ${(milestoneIndexMeta ?? 0) + 1}`;
      }
      if (proposal) {
        const projectTitle = proposal.project?.project_title ?? '';
        const { ConversationService } = await import('../chat/ConversationService');
        const { CHAT_SYSTEM_MESSAGES } = await import('../../constants/chatSystemMessages');
        await ConversationService.syncSystemMessage(
          tx.from_id,
          tx.to_id,
          '',
          {
            activityType: 'payment_released',
            activityId: proposal.unique_id,
            projectTitle,
            milestoneTitle,
            messageSent: CHAT_SYSTEM_MESSAGES.PAYMENT_RELEASED_SENT,
            messageReceived: CHAT_SYSTEM_MESSAGES.PAYMENT_RELEASED_RECEIVED
          },
          proposal.project?.id,
          userId
        );
      }
    }
    return { success: true };
  }

  // Get user's payment methods
  static async getPaymentMethods(userId: string) {
    const userIdNum = parseInt(userId);
    const paymentMethods = await prisma.paymentMethod.findMany({
      where: { user_id: userIdNum },
      orderBy: [
        { is_default: 'desc' },
        { created_at: 'desc' }
      ]
    });

    return {
      success: true,
      data: paymentMethods.map((pm: any) => ({
        id: pm.id,
        paymentType: pm.payment_type,
        cardBrand: pm.card_brand,
        lastFourDigits: pm.last_four_digits,
        cardHolderName: pm.card_holder_name,
        expiryMonth: pm.expiry_month,
        expiryYear: pm.expiry_year,
        paypalEmail: pm.paypal_email,
        isVerified: pm.is_verified,
        isDefault: pm.is_default,
        createdAt: pm.created_at
      }))
    };
  }

  // Set payment method as default
  static async setDefaultPaymentMethod(userId: string, paymentMethodId: string) {
    const userIdNum = parseInt(userId);
    const paymentMethodIdNum = parseInt(paymentMethodId);

    // Verify payment method belongs to user
    const paymentMethod = await prisma.paymentMethod.findFirst({
      where: {
        id: paymentMethodIdNum,
        user_id: userIdNum
      }
    });

    if (!paymentMethod) {
      return {
        success: false,
        message: "Payment method not found"
      };
    }

    // Unset all other default payment methods for this user
    await prisma.paymentMethod.updateMany({
      where: { user_id: userIdNum },
      data: { is_default: false }
    });

    // Set this payment method as default
    await prisma.paymentMethod.update({
      where: { id: paymentMethodIdNum },
      data: { is_default: true }
    });

    return {
      success: true,
      message: "Payment method set as default successfully"
    };
  }

  // Delete payment method
  static async deletePaymentMethod(userId: string, paymentMethodId: string) {
    const userIdNum = parseInt(userId);
    const paymentMethodIdNum = parseInt(paymentMethodId);
    const paymentMethod = await prisma.paymentMethod.findFirst({
      where: {
        id: paymentMethodIdNum,
        user_id: userIdNum
      }
    });

    if (!paymentMethod) {
      return {
        success: false,
        message: "Payment method not found"
      };
    }

    // Check if this is the default payment method
    if (paymentMethod.is_default) {
      // Check if user has other payment methods
      const otherMethods = await prisma.paymentMethod.count({
        where: {
          user_id: userIdNum,
          id: { not: paymentMethodIdNum }
        }
      });

      if (otherMethods > 0) {
        return {
          success: false,
          message: "Cannot delete default payment method. Please set another card as default first.",
          requiresDefaultReassignment: true
        };
      }
      // If this is the only card, allow deletion
    }

    await prisma.paymentMethod.delete({
      where: { id: paymentMethodIdNum }
    });

    return {
      success: true,
      message: "Payment method deleted successfully"
    };
  }

  // Save or update tax information
  static async saveTaxInformation(userId: string, data: TaxInformationInput) {
    const userIdNum = parseInt(userId);
    const taxInfo = await prisma.taxInformation.upsert({
      where: { user_id: userIdNum },
      update: {
        tax_residence: data.taxResidence,
        has_gstin: data.hasGSTIN,
        gstin: data.gstin || null,
        updated_at: new Date()
      },
      create: {
        user_id: userIdNum,
        tax_residence: data.taxResidence,
        has_gstin: data.hasGSTIN,
        gstin: data.gstin || null
      }
    });

    return {
      success: true,
      message: "Tax information saved successfully",
      data: {
        id: taxInfo.id,
        taxResidence: taxInfo.tax_residence,
        hasGSTIN: taxInfo.has_gstin,
        gstin: taxInfo.gstin
      }
    };
  }

  // Get user's tax information
  static async getTaxInformation(userId: string) {
    const userIdNum = parseInt(userId);
    const taxInfo = await prisma.taxInformation.findUnique({
      where: { user_id: userIdNum }
    });

    if (!taxInfo) {
      return {
        success: true,
        data: null
      };
    }

    return {
      success: true,
      data: {
        id: taxInfo.id,
        taxResidence: taxInfo.tax_residence,
        hasGSTIN: taxInfo.has_gstin,
        gstin: taxInfo.gstin
      }
    };
  }

  // Get billing history/transactions
  static async getBillingHistory(
    userId: string, 
    page: number = 1, 
    limit: number = 10,
    fromDate?: string,
    toDate?: string,
    search?: string,
    creditsOnly?: boolean
  ) {
    const userIdNum = parseInt(userId);
    const skip = (page - 1) * limit;

    // creditsOnly (My Earning): only where user is receiver (to_id) and amount >= 0. Otherwise show all.
    const baseWhere: any = creditsOnly
      ? { to_id: userIdNum, amount: { gte: 0 } }
      : { OR: [{ from_id: userIdNum }, { to_id: userIdNum }] };
    if (fromDate || toDate) {
      baseWhere.created_at = {};
      if (fromDate) baseWhere.created_at.gte = new Date(fromDate);
      if (toDate) {
        const endDate = new Date(toDate);
        endDate.setHours(23, 59, 59, 999);
        baseWhere.created_at.lte = endDate;
      }
    }
    const whereClause: any = search
      ? {
          AND: [
            baseWhere,
            {
              OR: [
                { unique_id: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } }
              ]
            }
          ]
        }
      : baseWhere;

    const [transactions, total] = await Promise.all([
      (prisma as any).billingTransaction.findMany({
        where: whereClause,
        include: {
          currency: true,
          payer_invoice: { select: { id: true, file_url: true } },
          receiver_invoice: { select: { id: true, file_url: true } }
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit
      }),
      prisma.billingTransaction.count({
        where: whereClause
      })
    ]);

    // Resolve client name: if to_id is me then client = from (payer), else client = to (recipient)
    const counterpartyIds = [...new Set(transactions.map((t: any) => t.to_id === userIdNum ? t.from_id : t.to_id))] as number[];
    const users = counterpartyIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: counterpartyIds } },
          select: { id: true, first_name: true, last_name: true }
        })
      : [];
    const nameByUserId: Record<number, string> = {};
    for (const u of users) {
      nameByUserId[u.id] = [u.first_name, u.last_name].filter(Boolean).join(' ').trim() || '—';
    }

    // Resolve contractTitle for Proposal transactions (project title)
    const proposalIds = [...new Set(transactions.filter((t: any) => t.subject_type === 'Proposal').map((t: any) => t.subject_id))];
    let contractTitleByProposalId: Record<number, string> = {};
    if (proposalIds.length > 0) {
      const proposals = await (prisma as any).proposal.findMany({
        where: { id: { in: proposalIds } },
        include: { project: { select: { project_title: true } } }
      });
      for (const p of proposals) {
        contractTitleByProposalId[p.id] = p.project?.project_title ?? p.project?.title ?? '';
      }
    }

    return {
      success: true,
      data: {
        transactions: transactions.map((t: any) => {
          const isCredit = t.to_id === userIdNum;
          const counterpartyId = isCredit ? t.from_id : t.to_id;
          const clientName = t.type === 'service_fee' && counterpartyId === 0
            ? 'Platform'
            : (nameByUserId[counterpartyId] ?? '—');
          const payerInv = t.payer_invoice;
          const receiverInv = t.receiver_invoice;
          const invoiceUrlLegacy = t.invoice_url;
          const invoiceUrl = isCredit ? (receiverInv?.file_url ?? invoiceUrlLegacy) : (payerInv?.file_url ?? invoiceUrlLegacy);
          return {
            id: t.id,
            uniqueId: t.unique_id,
            amount: t.amount,
            currency: t.currency?.code || 'INR',
            currencySymbol: t.currency?.symbol || '₹',
            type: t.type,
            status: t.status,
            senderStatus: t.sender_status ?? t.status,
            receiverStatus: t.receiver_status ?? t.status,
            adminStatus: t.admin_status ?? null,
            description: t.description,
            invoiceUrl,
            payerInvoiceId: payerInv?.id ?? null,
            receiverInvoiceId: receiverInv?.id ?? null,
            payerInvoiceUrl: payerInv?.file_url ?? null,
            receiverInvoiceUrl: receiverInv?.file_url ?? null,
            fromId: t.from_id,
            toId: t.to_id,
            createdAt: t.created_at,
            direction: isCredit ? 'credit' : 'debit',
            clientName,
            subjectType: t.subject_type,
            subjectId: t.subject_id,
            contractTitle: t.subject_type === 'Proposal' ? (contractTitleByProposalId[t.subject_id] ?? t.description) : undefined
          };
        }),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    };
  }

  // Get user's balance and billing totals (uses User cache when set, else aggregates from transactions)
  static async getUserBalance(userId: string) {
    const userIdNum = parseInt(userId);
    const user = await (prisma as any).user.findUnique({
      where: { id: userIdNum },
      select: { total_earning: true, total_withdrawal: true, wallet_amount: true, pending_amount: true }
    }) as { total_earning?: unknown; total_withdrawal?: unknown; wallet_amount?: unknown; pending_amount?: unknown } | null;

    let totalEarning = 0;
    let totalWithdrawal = 0;
    let walletAmount = 0;
    let pendingAmount = 0;

    if (user?.total_earning != null || user?.wallet_amount != null) {
      totalEarning = Number(user?.total_earning ?? 0);
      totalWithdrawal = Number(user?.total_withdrawal ?? 0);
      walletAmount = Number(user?.wallet_amount ?? 0);
      pendingAmount = Number(user?.pending_amount ?? 0);
    } else {
      const [credits, debits, withdrawals, pendingCredits] = await Promise.all([
        prisma.billingTransaction.aggregate({
          where: { to_id: userIdNum, status: 'completed' },
          _sum: { amount: true }
        }),
        prisma.billingTransaction.aggregate({
          where: { from_id: userIdNum, status: 'completed' },
          _sum: { amount: true }
        }),
        prisma.billingTransaction.aggregate({
          where: { from_id: userIdNum, type: 'withdrawal', status: 'completed' },
          _sum: { amount: true }
        }),
        prisma.billingTransaction.aggregate({
          where: { to_id: userIdNum, status: 'pending' },
          _sum: { amount: true }
        })
      ]);
      totalEarning = Number(credits._sum?.amount || 0);
      totalWithdrawal = Number(withdrawals._sum?.amount || 0);
      walletAmount = Number(credits._sum?.amount || 0) - Number(debits._sum?.amount || 0);
      pendingAmount = Number(pendingCredits._sum?.amount || 0);
    }

    const { amount: convertedBalance, currency, currencySymbol } = await convertToUserCurrency(userIdNum, walletAmount);
    const { amount: convertedTotalEarning } = await convertToUserCurrency(userIdNum, totalEarning);
    const { amount: convertedTotalWithdrawal } = await convertToUserCurrency(userIdNum, totalWithdrawal);
    const { amount: convertedPending } = await convertToUserCurrency(userIdNum, pendingAmount);

    return {
      success: true,
      data: {
        balance: convertedBalance,
        currency,
        currencySymbol,
        totalEarning: convertedTotalEarning,
        totalWithdrawal: convertedTotalWithdrawal,
        pendingBalance: convertedPending
      }
    };
  }

  // ----- Withdrawal methods (freelancer only) -----

  static async getWithdrawalMethods(userId: string) {
    const userIdNum = parseInt(userId);
    const methods = await (prisma as any).withdrawalMethod.findMany({
      where: { user_id: userIdNum },
      orderBy: [{ is_default: 'desc' }, { created_at: 'desc' }]
    });
    return {
      success: true,
      data: methods.map((m: any) => ({
        id: m.id,
        type: m.type,
        displayLabel: m.display_label,
        bankName: m.bank_name,
        accountNumberLast4: m.account_number_last4,
        ifsc: m.ifsc,
        upiId: m.upi_id,
        isDefault: m.is_default,
        createdAt: m.created_at
      }))
    };
  }

  static async createWithdrawalMethod(
    userId: string,
    data: { type: string; displayLabel: string; bankName?: string; accountNumber?: string; accountNumberLast4?: string; ifsc?: string; upiId?: string; isDefault?: boolean }
  ) {
    const userIdNum = parseInt(userId);
    if (data.type === 'bank_account' && !data.accountNumber?.trim()) {
      return { success: false, message: 'Bank account number is required' };
    }
    const accountNumber = data.accountNumber?.replace(/\D/g, '').trim() || null;
    const accountNumberLast4 = accountNumber
      ? accountNumber.slice(-4)
      : (data.accountNumberLast4?.replace(/\D/g, '').slice(-4) || null);
    if (data.isDefault) {
      await (prisma as any).withdrawalMethod.updateMany({
        where: { user_id: userIdNum },
        data: { is_default: false }
      });
    }
    const method = await (prisma as any).withdrawalMethod.create({
      data: {
        user_id: userIdNum,
        type: data.type,
        display_label: data.displayLabel,
        bank_name: data.bankName ?? null,
        account_number: data.type === 'bank_account' ? accountNumber : null,
        account_number_last4: data.type === 'bank_account' ? accountNumberLast4 : null,
        ifsc: data.ifsc ?? null,
        upi_id: data.upiId ?? null,
        is_default: data.isDefault ?? false
      }
    });
    return {
      success: true,
      message: 'Withdrawal method added',
      data: {
        id: method.id,
        type: method.type,
        displayLabel: method.display_label,
        bankName: method.bank_name,
        accountNumberLast4: method.account_number_last4,
        ifsc: method.ifsc,
        upiId: method.upi_id,
        isDefault: method.is_default,
        createdAt: method.created_at
      }
    };
  }

  static async setDefaultWithdrawalMethod(userId: string, methodId: string) {
    const userIdNum = parseInt(userId);
    const methodIdNum = parseInt(methodId);
    await (prisma as any).withdrawalMethod.updateMany({
      where: { user_id: userIdNum },
      data: { is_default: false }
    });
    await (prisma as any).withdrawalMethod.update({
      where: { id: methodIdNum, user_id: userIdNum },
      data: { is_default: true }
    });
    return { success: true, message: 'Default withdrawal method updated' };
  }

  static async deleteWithdrawalMethod(userId: string, methodId: string) {
    const userIdNum = parseInt(userId);
    const methodIdNum = parseInt(methodId);
    await (prisma as any).withdrawalMethod.deleteMany({
      where: { id: methodIdNum, user_id: userIdNum }
    });
    return { success: true, message: 'Withdrawal method removed' };
  }

  /** Request withdrawal (freelancer only). Creates a withdrawal billing transaction. */
  static async requestWithdrawal(userId: string, amount: number, withdrawalMethodId: number) {
    const userIdNum = parseInt(userId);
    if (!amount || amount <= 0) {
      return { success: false, message: 'Invalid amount' };
    }
    const method = await (prisma as any).withdrawalMethod.findFirst({
      where: { id: withdrawalMethodId, user_id: userIdNum }
    });
    if (!method) {
      return { success: false, message: 'Withdrawal method not found' };
    }
    const balanceResult = await this.getUserBalance(userId);
    const balance = (balanceResult as any).data?.balance ?? 0;
    if (amount > balance) {
      return { success: false, message: 'Insufficient balance' };
    }
    const currencyId = 1;
    const row = await prisma.billingTransaction.create({
      data: {
        actor_type: 'User',
        actor_id: userIdNum,
        from_type: 'User',
        from_id: userIdNum,
        to_type: 'Platform',
        to_id: 0,
        subject_type: 'Withdrawal',
        subject_id: withdrawalMethodId,
        amount,
        currency_id: currencyId,
        type: 'withdrawal',
        status: 'pending',
        sender_status: 'pending',
        receiver_status: 'pending',
        description: `Withdrawal to ${method.display_label}`,
        meta: { withdrawal_method_id: String(withdrawalMethodId) } as object
      } as any
    });
    await this.updateUserBillingTotalsAfterTransaction('withdrawal', 'pending', userIdNum, 0, amount);
    return {
      success: true,
      data: { transactionId: row.id, transactionUniqueId: row.unique_id },
      message: 'Withdrawal requested'
    };
  }

  // Refund verification amount if needed
  static async refundVerificationAmount(paymentId: string) {
    try {
      const refund = await razorpay.payments.refund(paymentId, {
        amount: 100, // Refund 1 INR in paise
        notes: {
          reason: 'Card verification refund'
        }
      });

      return {
        success: true,
        data: refund
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to process refund'
      };
    }
  }

  /** Ensure an Invoice row exists for this transaction + party (for client-side PDF). Creates if missing. */
  static async ensureInvoiceForTransaction(transactionId: number, party: 'payer' | 'receiver') {
    const transaction = await (prisma as any).billingTransaction.findUnique({
      where: { id: transactionId },
      include: { currency: true, payer_invoice: true, receiver_invoice: true }
    });
    if (!transaction) throw new Error('Transaction not found');
    const existing = party === 'payer' ? transaction.payer_invoice : transaction.receiver_invoice;
    if (existing) return existing;

    const users = await (prisma as any).user.findMany({
      where: { id: { in: [transaction.from_id, transaction.to_id] } },
      select: { id: true, first_name: true, last_name: true }
    });
    const name = (u: { first_name: string | null; last_name: string | null }) =>
      [u?.first_name, u?.last_name].filter(Boolean).join(' ').trim() || '—';
    const fromUser = users.find((u: any) => u.id === transaction.from_id);
    const toUser = users.find((u: any) => u.id === transaction.to_id);
    const senderName = fromUser ? name(fromUser) : `User ${transaction.from_id}`;
    const receiverName = toUser ? name(toUser) : `User ${transaction.to_id}`;
    const invoiceNumber = `INV-${transaction.unique_id}-${party}`;

    const invoice = await (prisma as any).invoice.create({
      data: {
        billing_transaction_id: transactionId,
        party,
        sender_name: senderName,
        receiver_name: receiverName,
        amount: parseFloat(transaction.amount.toString()),
        currency_code: transaction.currency?.code ?? 'INR',
        description: transaction.description,
        invoice_number: invoiceNumber,
        meta: transaction.meta ?? undefined
      }
    });

    await (prisma as any).billingTransaction.update({
      where: { id: transactionId },
      data: party === 'payer' ? { payer_invoice_id: invoice.id } : { receiver_invoice_id: invoice.id }
    });
    return invoice;
  }

  /** Get invoice data for client-side PDF generation. Ensures Invoice exists, returns JSON (no file). */
  static async getInvoiceData(uniqueId: string, userId: number) {
    const transaction = await (prisma as any).billingTransaction.findUnique({
      where: { unique_id: uniqueId },
      include: { currency: true, payer_invoice: true, receiver_invoice: true }
    });
    if (!transaction) return { success: false as const, message: 'Transaction not found' };
    if (transaction.from_id !== userId && transaction.to_id !== userId) {
      return { success: false as const, message: 'Unauthorized' };
    }
    const isPayer = transaction.from_id === userId;
    const party = isPayer ? 'payer' : 'receiver';
    let invoice = isPayer ? transaction.payer_invoice : transaction.receiver_invoice;
    if (!invoice) {
      invoice = await this.ensureInvoiceForTransaction(transaction.id, party);
    }
    return {
      success: true as const,
      data: {
        uniqueId: transaction.unique_id,
        invoiceNumber: invoice.invoice_number,
        senderName: invoice.sender_name,
        receiverName: invoice.receiver_name,
        amount: parseFloat(invoice.amount.toString()),
        currencyCode: invoice.currency_code,
        description: invoice.description,
        type: transaction.type,
        status: transaction.status,
        issuedAt: invoice.issued_at,
        meta: invoice.meta ?? undefined
      }
    };
  }

  // Get transaction detail by uniqueId; if Proposal, include milestone payments for this proposal
  static async getTransactionDetail(uniqueId: string, userId: string) {
    const userIdNum = parseInt(userId);
    const transaction = await (prisma as any).billingTransaction.findUnique({
      where: { unique_id: uniqueId },
      include: { currency: true, payer_invoice: { select: { id: true, file_url: true } }, receiver_invoice: { select: { id: true, file_url: true } } }
    });
    if (!transaction) {
      return { success: false, message: 'Transaction not found' };
    }
    if (transaction.from_id !== userIdNum && transaction.to_id !== userIdNum) {
      return { success: false, message: 'Unauthorized' };
    }
    const counterpartyId = transaction.to_id === userIdNum ? transaction.from_id : transaction.to_id;
    const clientName =
      (transaction as any).type === 'service_fee' && counterpartyId === 0
        ? 'Platform'
        : (await prisma.user.findMany({
            where: { id: counterpartyId },
            select: { first_name: true, last_name: true }
          }).then((users) => {
            const u = users[0];
            return u ? [u.first_name, u.last_name].filter(Boolean).join(' ').trim() || '—' : '—';
          }));
    const isCredit = transaction.to_id === userIdNum;
    const metaObj = (transaction as any).meta as Record<string, unknown> | null;
    const metaMap: Record<string, string> = {};
    if (metaObj && typeof metaObj === 'object') {
      for (const [k, v] of Object.entries(metaObj)) {
        if (v != null) metaMap[k] = String(v);
      }
    }
    const transactionMilestoneId = (transaction as any).milestone_id as number | null | undefined;
    const milestoneIndexFallback = metaMap.milestone_index != null ? parseInt(metaMap.milestone_index, 10) : undefined;

    const payerInv = transaction.payer_invoice;
    const receiverInv = transaction.receiver_invoice;
    const invoiceUrlForUser = isCredit ? (receiverInv?.file_url ?? transaction.invoice_url) : (payerInv?.file_url ?? transaction.invoice_url);
    const base: any = {
      id: transaction.id,
      uniqueId: transaction.unique_id,
      amount: parseFloat(transaction.amount.toString()),
      currency: transaction.currency?.code || 'INR',
      currencySymbol: transaction.currency?.symbol || '₹',
      type: transaction.type,
      status: transaction.status,
      senderStatus: transaction.sender_status ?? transaction.status,
      receiverStatus: transaction.receiver_status ?? transaction.status,
      adminStatus: transaction.admin_status ?? null,
      description: transaction.description,
      invoiceUrl: invoiceUrlForUser,
      payerInvoiceId: payerInv?.id ?? null,
      receiverInvoiceId: receiverInv?.id ?? null,
      fromId: transaction.from_id,
      toId: transaction.to_id,
      createdAt: transaction.created_at,
      direction: isCredit ? 'credit' : 'debit',
      clientName,
      subjectType: transaction.subject_type,
      subjectId: transaction.subject_id,
      contractTitle: undefined as string | undefined,
      milestonePayments: undefined as any[] | undefined,
      razorpayPaymentId: metaMap.razorpay_payment_id ?? undefined,
      razorpayOrderId: metaMap.razorpay_order_id ?? undefined,
      razorpayMethod: metaMap.razorpay_method ?? undefined,
      razorpayStatus: metaMap.razorpay_status ?? undefined,
      razorpayBank: metaMap.razorpay_bank ?? undefined,
      razorpayCardLast4: metaMap.razorpay_card_last4 ?? undefined,
      razorpayCardNetwork: metaMap.razorpay_card_network ?? undefined,
      razorpayVpa: metaMap.razorpay_vpa ?? undefined,
      razorpayBankTransactionId: metaMap.razorpay_bank_transaction_id ?? undefined,
      razorpayAuthCode: metaMap.razorpay_auth_code ?? undefined
    };

    if (transaction.subject_type === 'Proposal' && transaction.subject_id) {
      const proposal = await (prisma as any).proposal.findFirst({
        where: { id: transaction.subject_id },
        include: { project: { select: { project_title: true } } }
      });
      if (proposal) {
        base.contractTitle = proposal.project?.project_title ?? '';
        base.milestonePayments = [];
        // For payment tx: show only the one milestone this transaction paid for (use milestone_id when set)
        if ((transaction as any).type === 'payment') {
          let row: any = null;
          if (transactionMilestoneId != null) {
            row = await (prisma as any).milestone.findUnique({
              where: { id: transactionMilestoneId }
            });
          }
          if (!row && milestoneIndexFallback != null && !Number.isNaN(milestoneIndexFallback)) {
            const milestones = await (prisma as any).milestone.findMany({
              where: { proposal_id: transaction.subject_id },
              orderBy: { order_index: 'asc' }
            });
            row = milestones.find((m: any) => m.order_index === milestoneIndexFallback);
          }
          if (row) {
            const serviceFeeAmount = row.service_fee_amount != null ? parseFloat(String(row.service_fee_amount)) : undefined;
            base.milestonePayments.push({
              milestoneIndex: (row.order_index ?? 0) + 1,
              title: row.title ?? row.description ?? `Milestone ${(row.order_index ?? 0) + 1}`,
              amount: parseFloat(String(row.amount)),
              paid: true,
              transactionUniqueId: transaction.unique_id,
              date: transaction.created_at,
              serviceFeeAmount: serviceFeeAmount != null && serviceFeeAmount > 0 ? serviceFeeAmount : undefined
            });
          }
        }
      }
    }

    return { success: true, data: base };
  }

}

