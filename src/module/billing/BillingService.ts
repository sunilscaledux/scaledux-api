import { prisma } from "@services/prismaService";
import { PaymentMethodInput, TaxInformationInput, RazorpayVerificationInput } from "./BillingType";
import crypto from "crypto";
import Razorpay from "razorpay";
import razorpayConfig from "@config/razorpay";
import { convertToUserCurrency } from "@utils/currencyConverter";
import { dispatch } from "../../queues/Queue";
import { InvoiceGenerator } from "../../services/InvoiceGenerator";
import { GenerateInvoiceJob } from "../../jobs/GenerateInvoiceJob";

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
   * Record a payment: one billing row (from payer to payee). subject_type and subject_id are on the row.
   * Optional meta (e.g. milestone_index, razorpay_payment_id) is stored in BillingTransactionMeta.
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
  }) {
    const { actorId, fromId, toId, subjectType, subjectId, amount, description, meta } = params;
    const currencyId = 1;

    const row = await prisma.billingTransaction.create({
      data: {
        actor_type: 'User',
        actor_id: actorId,
        from_type: 'User',
        from_id: fromId,
        to_type: 'User',
        to_id: toId,
        subject_type: subjectType,
        subject_id: subjectId,
        amount,
        currency_id: currencyId,
        type: 'payment',
        status: 'completed',
        description
      }
    });
    const metaRows: { transaction_id: number; key: string; value: string }[] = [];
    if (meta) {
      for (const [k, v] of Object.entries(meta)) {
        metaRows.push({ transaction_id: row.id, key: k, value: String(v) });
      }
    }
    if (metaRows.length > 0) {
      await prisma.billingTransactionMeta.createMany({ data: metaRows });
    }

    return { success: true, data: { transactionId: row.id, transactionUniqueId: row.unique_id } };
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
    search?: string
  ) {
    const userIdNum = parseInt(userId);
    const skip = (page - 1) * limit;

    // Show transactions where current user is sender (from_id) or receiver (to_id)
    const baseWhere: any = {
      OR: [{ from_id: userIdNum }, { to_id: userIdNum }]
    };
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
      prisma.billingTransaction.findMany({
        where: whereClause,
        include: {
          currency: true
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
    const counterpartyIds = [...new Set(transactions.map((t: any) => t.to_id === userIdNum ? t.from_id : t.to_id))];
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
          return {
            id: t.id,
            uniqueId: t.unique_id,
            amount: t.amount,
            currency: t.currency?.code || 'INR',
            currencySymbol: t.currency?.symbol || '₹',
            type: t.type,
            status: t.status,
            description: t.description,
            invoiceUrl: t.invoice_url,
            createdAt: t.created_at,
            direction: isCredit ? 'credit' : 'debit',
            clientName: nameByUserId[counterpartyId] ?? '—',
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

  // Get user's balance
  static async getUserBalance(userId: string) {
    const userIdNum = parseInt(userId);

    // Credit = received (to_id = me), debit = sent (from_id = me). Balance = credits - debits.
    const [credits, debits] = await Promise.all([
      prisma.billingTransaction.aggregate({
        where: { to_id: userIdNum, status: 'completed' },
        _sum: { amount: true }
      }),
      prisma.billingTransaction.aggregate({
        where: { from_id: userIdNum, status: 'completed' },
        _sum: { amount: true }
      })
    ]);

    const balanceInUSD = Number(credits._sum?.amount || 0) - Number(debits._sum?.amount || 0);
    
    // Convert to user's currency using utility function
    const { amount: convertedBalance, currency, currencySymbol } = await convertToUserCurrency(userIdNum, balanceInUSD);

    return {
      success: true,
      data: {
        balance: convertedBalance,
        currency,
        currencySymbol
      }
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

  // Trigger invoice generation for a transaction
  static async triggerInvoiceGeneration(transactionId: number) {
    try {
      const transaction = await prisma.billingTransaction.findUnique({
        where: { id: transactionId },
        include: { currency: true }
      });

      if (!transaction) {
        throw new Error('Transaction not found');
      }

      // Add job to queue (Laravel style - pass the class)
      await dispatch(GenerateInvoiceJob, {
        transactionId: transaction.id,
        uniqueId: transaction.unique_id,
        amount: parseFloat(transaction.amount.toString()),
        currency: transaction.currency.code,
        type: transaction.type,
        status: transaction.status,
        description: transaction.description,
        createdAt: transaction.created_at,
        actorType: transaction.actor_type,
        actorId: transaction.actor_id,
        fromType: transaction.from_type,
        fromId: transaction.from_id,
        toType: transaction.to_type,
        toId: transaction.to_id,
        subjectType: transaction.subject_type,
        subjectId: transaction.subject_id
      }, {
        jobId: `invoice-${transaction.unique_id}`,
        priority: 1
      });

      return {
        success: true,
        message: 'Invoice generation job queued successfully'
      };
    } catch (error: any) {
      console.error('Error triggering invoice generation:', error);
      throw error;
    }
  }

  // Get transaction detail by uniqueId; if Proposal, include milestone payments for this proposal
  static async getTransactionDetail(uniqueId: string, userId: string) {
    const userIdNum = parseInt(userId);
    const transaction = await prisma.billingTransaction.findUnique({
      where: { unique_id: uniqueId },
      include: { currency: true, meta: true }
    });
    if (!transaction) {
      return { success: false, message: 'Transaction not found' };
    }
    if (transaction.from_id !== userIdNum && transaction.to_id !== userIdNum) {
      return { success: false, message: 'Unauthorized' };
    }
    const counterpartyId = transaction.to_id === userIdNum ? transaction.from_id : transaction.to_id;
    const [counterparty] = await prisma.user.findMany({
      where: { id: counterpartyId },
      select: { id: true, first_name: true, last_name: true }
    });
    const clientName = counterparty
      ? [counterparty.first_name, counterparty.last_name].filter(Boolean).join(' ').trim() || '—'
      : '—';
    const isCredit = transaction.to_id === userIdNum;
    const metaMap: Record<string, string> = {};
    for (const m of transaction.meta) {
      metaMap[m.key] = m.value;
    }
    const milestoneIndex = metaMap.milestone_index != null ? parseInt(metaMap.milestone_index, 10) : undefined;

    const base: any = {
      id: transaction.id,
      uniqueId: transaction.unique_id,
      amount: parseFloat(transaction.amount.toString()),
      currency: transaction.currency?.code || 'INR',
      currencySymbol: transaction.currency?.symbol || '₹',
      type: transaction.type,
      status: transaction.status,
      description: transaction.description,
      invoiceUrl: transaction.invoice_url,
      createdAt: transaction.created_at,
      direction: isCredit ? 'credit' : 'debit',
      clientName,
      subjectType: transaction.subject_type,
      subjectId: transaction.subject_id,
      contractTitle: undefined as string | undefined,
      milestonePayments: undefined as any[] | undefined
    };

    if (transaction.subject_type === 'Proposal' && transaction.subject_id) {
      const proposal = await (prisma as any).proposal.findFirst({
        where: { id: transaction.subject_id },
        include: {
          project: { select: { project_title: true } },
          milestonesRows: { orderBy: { order_index: 'asc' } }
        }
      });
      if (proposal) {
        base.contractTitle = proposal.project?.project_title ?? '';
        const proposalTxns = await prisma.billingTransaction.findMany({
          where: { subject_type: 'Proposal', subject_id: transaction.subject_id },
          include: { meta: true, currency: true }
        });
        const txByMilestoneIndex: Record<number, any> = {};
        for (const tx of proposalTxns) {
          const mIndex = tx.meta?.find((m: any) => m.key === 'milestone_index')?.value;
          if (mIndex != null) {
            const idx = parseInt(mIndex, 10);
            if (!Number.isNaN(idx)) txByMilestoneIndex[idx] = tx;
          }
        }
        const milestones = proposal.milestonesRows ?? [];
        const paidUpTo = milestoneIndex != null && !Number.isNaN(milestoneIndex) ? milestoneIndex : (milestones.length - 1);
        const rowsToShow = Math.max(paidUpTo + 1, milestones.length);
        base.milestonePayments = [];
        for (let i = 0; i < rowsToShow; i++) {
          const row = milestones[i];
          const tx = txByMilestoneIndex[i];
          base.milestonePayments.push({
            milestoneIndex: i + 1,
            title: row?.title ?? row?.description ?? `Milestone ${i + 1}`,
            amount: row ? parseFloat(String(row.amount)) : 0,
            paid: !!tx,
            transactionUniqueId: tx?.unique_id ?? null,
            date: tx?.created_at ?? null
          });
        }
      }
    }

    return { success: true, data: base };
  }

  // Download invoice by transaction unique ID
  static async getInvoicePath(uniqueId: string) {
    try {
      const transaction = await prisma.billingTransaction.findUnique({
        where: { unique_id: uniqueId }
      });

      if (!transaction) {
        return {
          success: false,
          message: 'Transaction not found'
        };
      }

      // Check if invoice URL exists in database
      if (!transaction.invoice_url) {
        // If invoice doesn't exist, trigger generation
        await this.triggerInvoiceGeneration(transaction.id);
        
        return {
          success: false,
          message: 'Invoice is being generated. Please try again in a few moments.'
        };
      }

      // Convert URL to file system path
      const invoicePath = path.join(__dirname, '../../..', transaction.invoice_url);
      
      return {
        success: true,
        path: invoicePath
      };
    } catch (error: any) {
      console.error('Error getting invoice:', error);
      throw error;
    }
  }

}
