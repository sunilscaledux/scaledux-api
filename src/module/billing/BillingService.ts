import { prisma } from "@services/prismaService";
import { Prisma } from "@prisma/client";
import { PaymentMethodInput, TaxInformationInput, RazorpayVerificationInput } from "./BillingType";
import crypto from "crypto";
import Razorpay from "razorpay";
import razorpayConfig from "@config/razorpay";
import { appConfig } from "@config/app";
import { Log } from "@services/loggerService";
import { convertToUserCurrency } from "@utils/currencyConverter";
import { createContactAndFundAccount, isRazorpayConfigured } from "@services/razorpayService";
import { verifyGSTIN, matchAddress } from "@services/idtoaiService";
import {
  BillingTransactionType,
  BillingTransactionStatus,
  BillingTransactionSenderStatus,
  BillingTransactionReceiverStatus,
  WithdrawalRequestStatus,
  ProposalStatus,
} from "@constants/status";

// Initialize Razorpay (only if keys are provided)
let razorpay: any = null;
if (razorpayConfig.key_id && razorpayConfig.key_secret) {
    razorpay = new Razorpay({
        key_id: razorpayConfig.key_id,
        key_secret: razorpayConfig.key_secret
    });
}

export class BillingService {
  /** Payer amount (base + platform fee + GST only on first milestone) and receiver amount (base - service fee - GST). */
  private static getPayerAndReceiverAmounts(baseAmount: number, isFirstMilestone: boolean = true): { payerAmount: number; receiverAmount: number } {
    const gstPercent = appConfig.gstPercent / 100;
    const appFee = isFirstMilestone ? appConfig.appFeeFounder : 0;
    const gstOnAppFee = Math.round(appFee * gstPercent * 100) / 100;
    const serviceFeePercent = appConfig.serviceFeePercent / 100;
    const serviceCharge = Math.round(baseAmount * serviceFeePercent * 100) / 100;
    const gstOnServiceCharge = Math.round(serviceCharge * gstPercent * 100) / 100;
    const payerAmount = Math.round((baseAmount + appFee + gstOnAppFee) * 100) / 100;
    const receiverAmount = Math.round((baseAmount - serviceCharge - gstOnServiceCharge) * 100) / 100;
    return { payerAmount, receiverAmount };
  }

  /**
   * Resolve order amount from milestone (server-side only). Validates user is project owner and payment is allowed.
   * Returns totalFounderPays and platformTransferAmount so frontend cannot modify amount.
   */
  static async getMilestoneOrderAmount(
    userId: number,
    milestoneId: number,
    milestoneIndexFromFrontend?: number
  ): Promise<{ success: boolean; message?: string; totalFounderPays?: number; platformTransferAmountInr?: number }> {
    const milestoneRow = await (prisma as any).milestone.findUnique({
      where: { id: milestoneId },
      include: {
        proposal: {
          include: {
            project: { select: { id: true, user_id: true } },
            milestonesRows: { orderBy: { order_index: 'asc' } }
          }
        }
      }
    });
    if (!milestoneRow?.proposal) {
      return { success: false, message: 'Milestone not found' };
    }
    const proposal = milestoneRow.proposal;
    const rows = proposal.milestonesRows ?? [];
    let milestoneIndex: number;
    if (milestoneIndexFromFrontend !== undefined && Number.isFinite(milestoneIndexFromFrontend) && rows[milestoneIndexFromFrontend]?.id === milestoneId) {
      milestoneIndex = milestoneIndexFromFrontend;
    } else {
      milestoneIndex = rows.findIndex((r: any) => r.id === milestoneId);
    }
    if (milestoneIndex < 0) {
      return { success: false, message: 'Milestone not found for this proposal' };
    }
    if (proposal.project.user_id !== userId) {
      return { success: false, message: 'You are not the project owner' };
    }
    if (proposal.status !== ProposalStatus.OFFER_ACCEPTED && proposal.status !== ProposalStatus.HIRED) {
      return { success: false, message: 'Payment is only available after the freelancer has signed the NDA or already hired' };
    }
    const amount = Number(milestoneRow?.amount ?? 0) || 0;
    if (amount <= 0) {
      return { success: false, message: 'Invalid milestone amount' };
    }
    const isFirstMilestone = milestoneIndex === 0;
    const breakdown = this.getPaymentBreakdown(amount, isFirstMilestone);
    const totalFounderPays = breakdown.totalFounderPays ?? amount;
    const platformTransferAmountInr = (breakdown.appFee ?? 0) + (breakdown.gstOnAppFee ?? 0);
    return { success: true, totalFounderPays, platformTransferAmountInr };
  }

  /**
   * Create Razorpay order. Amount is only accepted from client for card verification (amount 1).
   * For payment, use getMilestoneOrderAmount + this with server-computed amount so user cannot modify amount.
   */
  static async createVerificationOrder(
    userId: string,
    amount: number = 1,
    options?: { platformTransferAmountPaise?: number; receiptPrefix?: string; notes?: Record<string, string> }
  ) {
    if (!razorpay) {
      return {
        success: false,
        message: 'Razorpay is not configured. Please add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to your .env file'
      };
    }

    const amountPaise = Math.round(amount * 100);
    const receiptPrefix = options?.receiptPrefix ?? 'verify';
    const notes = options?.notes ?? { purpose: 'card_verification', user_id: userId };
    const platformAccountId = appConfig.razorpayPlatformAccountId;
    const platformTransferPaise = options?.platformTransferAmountPaise ?? 0;

    const orderPayload: {
      amount: number;
      currency: string;
      receipt: string;
      notes: Record<string, string>;
      transfers?: Array<{ account: string; amount: number; currency: string }>;
    } = {
      amount: amountPaise,
      currency: 'INR',
      receipt: `${receiptPrefix}_${userId}_${Date.now()}`,
      notes
    };

    if (platformAccountId && platformTransferPaise > 0) {
      orderPayload.transfers = [
        { account: platformAccountId, amount: platformTransferPaise, currency: 'INR' }
      ];
    }

    try {
      const order = await razorpay.orders.create(orderPayload);

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
        message: error.message || 'Failed to create order'
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

  /**
   * Get payment breakdown for display and Razorpay order amount.
   * Platform fee (founder charge) is for the whole project: only first milestone gets appFee + gstOnAppFee; rest get 0, 0.
   * Founder pays: milestoneAmount + (appFee + gstOnAppFee only if first milestone) = totalFounderPays.
   * Freelancer (at release): milestoneAmount - serviceCharge - gstOnServiceCharge = net.
   */
  static getPaymentBreakdown(milestoneAmount?: number, isFirstMilestone: boolean = true) {
    const gstPercent = appConfig.gstPercent / 100;
    const appFee = isFirstMilestone ? appConfig.appFeeFounder : 0;
    const gstOnAppFee = Math.round(appFee * gstPercent * 100) / 100;
    const totalFounderPays = milestoneAmount != null
      ? Math.round((milestoneAmount + appFee + gstOnAppFee) * 100) / 100
      : undefined;
    const serviceFeePercent = appConfig.serviceFeePercent / 100;
    const serviceCharge = milestoneAmount != null
      ? Math.round(milestoneAmount * serviceFeePercent * 100) / 100
      : undefined;
    const gstOnServiceCharge = serviceCharge != null
      ? Math.round(serviceCharge * gstPercent * 100) / 100
      : undefined;
    const netToFreelancer = (milestoneAmount != null && serviceCharge != null && gstOnServiceCharge != null)
      ? Math.round((milestoneAmount - serviceCharge - gstOnServiceCharge) * 100) / 100
      : undefined;
    return {
      appFeeFounder: appConfig.appFeeFounder,
      gstPercent: appConfig.gstPercent,
      serviceFeePercent: appConfig.serviceFeePercent,
      ...(milestoneAmount != null && {
        milestoneAmount,
        appFee,
        gstOnAppFee,
        totalFounderPays,
        serviceCharge: serviceCharge ?? 0,
        gstOnServiceCharge: gstOnServiceCharge ?? 0,
        netToFreelancer,
      }),
    };
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
      Log.error('Error creating Razorpay customer', { error });
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
      Log.error('Error fetching payment details', { error });
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
      Log.error('Error fetching Razorpay payment for meta', { error });
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
      Log.error('Error charging saved card', { error });
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

  /** Ensure a UserWallet row exists for the user (for new users after migration). */
  private static async ensureUserWallet(userId: number): Promise<void> {
    await (prisma as any).userWallet.upsert({
      where: { user_id: userId },
      create: {
        user_id: userId,
        wallet_amount: 0,
        total_earning: 0,
        total_withdrawal: 0,
        pending_amount: 0,
      },
      update: {},
    });
  }

  /**
   * Update user billing totals after a transaction. Call after every billing transaction create.
   * Uses UserWallet table (separate from User).
   */
  private static async updateUserBillingTotalsAfterTransaction(
    type: 'payment' | 'refund' | 'withdrawal',
    status: string, // BillingTransactionStatus value
    fromId: number,
    toId: number,
    amount: number,
    receiverAmount?: number,
    receiverWalletAmount?: number
  ) {
    const amt = Number(amount);
    const toAmt = receiverAmount !== undefined ? Number(receiverAmount) : amt;
    const toWalletAmt = receiverWalletAmount !== undefined ? Number(receiverWalletAmount) : toAmt;
    if (type === BillingTransactionType.PAYMENT || type === BillingTransactionType.REFUND) {
      if (status !== BillingTransactionStatus.COMPLETED) return;
      if (toId > 0) {
        await this.ensureUserWallet(toId);
        await (prisma as any).userWallet.update({
          where: { user_id: toId },
          data: {
            total_earning: { increment: toAmt },
            wallet_amount: { increment: toWalletAmt },
          },
        });
      }
    } else if (type === BillingTransactionType.WITHDRAWAL) {
      if (fromId > 0) {
        await this.ensureUserWallet(fromId);
        if (status === BillingTransactionStatus.PENDING) {
          await (prisma as any).userWallet.update({
            where: { user_id: fromId },
            data: { wallet_amount: { decrement: amt } },
          });
        } else if (status === BillingTransactionStatus.COMPLETED) {
          await (prisma as any).userWallet.update({
            where: { user_id: fromId },
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
    const { actorId, fromId, toId, subjectType, subjectId, amount, description, meta, status = BillingTransactionStatus.COMPLETED, milestoneId } = params;
    const currencyId = 1;
    // Platform fee (founder charge) only on first milestone of project; rest get 0
    const isFirstMilestone = meta?.milestone_index !== undefined ? meta.milestone_index === '0' : true;
    const { payerAmount, receiverAmount } = this.getPayerAndReceiverAmounts(amount, isFirstMilestone);
    // When fund loaded (pending): sender = funded, receiver = pending. When completed: both completed.
    const senderStatus = status === BillingTransactionStatus.PENDING ? BillingTransactionSenderStatus.FUNDED : status;
    const receiverStatus = status === BillingTransactionStatus.PENDING ? BillingTransactionReceiverStatus.PENDING : status;

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
        payer_amount: payerAmount,
        receiver_amount: receiverAmount,
        currency_id: currencyId,
        type: BillingTransactionType.PAYMENT,
        status,
        sender_status: senderStatus,
        receiver_status: receiverStatus,
        description,
        meta: meta ? (meta as object) : undefined
      }
    });
    if (status === BillingTransactionStatus.COMPLETED) {
      await this.updateUserBillingTotalsAfterTransaction(BillingTransactionType.PAYMENT, BillingTransactionStatus.COMPLETED, fromId, toId, amount);
    } else if (status === BillingTransactionStatus.PENDING && toId > 0) {
      await this.ensureUserWallet(toId);
      // Pending amount = receiver amount only (from getPayerAndReceiverAmounts)
      await (prisma as any).userWallet.update({
        where: { user_id: toId },
        data: { pending_amount: { increment: receiverAmount } },
      });
    }

    // Create both payer and receiver invoices at payment time; UI shows receiver download only when receiver status allows withdraw
    await this.createInvoicesForTransaction(row.id);

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
    if (tx.type !== BillingTransactionType.PAYMENT) return { success: false, message: 'Not a payment transaction' };
    if (tx.status !== BillingTransactionStatus.PENDING) return { success: false, message: 'Payment is already completed or not pending' };
    if (tx.from_id !== userId) return { success: false, message: 'Only the payer can release this payment' };

    await (prisma as any).billingTransaction.update({
      where: { id: tx.id },
      data: {
        status: BillingTransactionStatus.COMPLETED,
        sender_status: BillingTransactionSenderStatus.RELEASED,
        receiver_status: BillingTransactionReceiverStatus.COMPLETED,
      }
    });
    const amount = Number(tx.amount);
    const feePercent = appConfig.serviceFeePercent;
    const gstPercent = appConfig.gstPercent / 100;
    const feeAmount = Math.round(amount * (feePercent / 100) * 100) / 100;
    const gstOnServiceCharge = Math.round(feeAmount * gstPercent * 100) / 100;
    const totalDeduction = feeAmount + gstOnServiceCharge;
    const netAmount = Math.round((amount - totalDeduction) * 100) / 100;

    // Remove receiver amount from freelancer's pending (same as what was added when founder funded)
    if (tx.to_id > 0) {
      await (prisma as any).userWallet.update({
        where: { user_id: tx.to_id },
        data: { pending_amount: { decrement: netAmount } },
      });
    }
    // Credit freelancer: total_earning += netAmount, wallet += netAmount (receiver amount only; fee never hits wallet)
    await this.updateUserBillingTotalsAfterTransaction(BillingTransactionType.PAYMENT, BillingTransactionStatus.COMPLETED, tx.from_id, tx.to_id, amount, netAmount, netAmount);

    // Create receiver invoice so freelancer has invoice with fee/GST breakdown
    await this.createInvoicesForTransaction(tx.id, { payer: false, receiver: true });

    const milestoneId = (tx as any).milestone_id as number | null | undefined;
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

  /** Receiver (freelancer) requests withdraw: create WithdrawalRequest (status pending) and set transaction to withdraw_in_process. Cron will process. */
  static async setReceiverWithdrawInProcess(transactionUniqueId: string, userId: number, withdrawalMethodId: number): Promise<{ success: boolean; message?: string }> {
    const tx = await (prisma as any).billingTransaction.findUnique({
      where: { unique_id: transactionUniqueId },
      include: { withdrawal_request: true }
    });
    if (!tx) return { success: false, message: 'Transaction not found' };
    if (tx.type !== BillingTransactionType.PAYMENT) return { success: false, message: 'Not a payment transaction' };
    if (tx.to_id !== userId) return { success: false, message: 'Only the receiver can request withdraw for this payment' };
    const current = (tx as any).receiver_status ?? tx.status;
    if (current !== BillingTransactionReceiverStatus.COMPLETED && current !== BillingTransactionReceiverStatus.RELEASED) {
      return { success: false, message: 'Withdraw can only be requested when receiver status is completed or released' };
    }
    const method = await (prisma as any).withdrawalMethod.findFirst({
      where: { id: withdrawalMethodId, user_id: tx.to_id }
    });
    if (!method) return { success: false, message: 'Withdrawal method not found or does not belong to you' };
    if ((tx as any).withdrawal_request) return { success: false, message: 'Withdrawal already requested for this payment' };
    await (prisma as any).withdrawalRequest.create({
      data: {
        user_id: tx.to_id,
        withdrawal_method_id: withdrawalMethodId,
        billing_transaction_id: tx.id,
        status: WithdrawalRequestStatus.PENDING
      }
    });
    await (prisma as any).billingTransaction.update({
      where: { id: tx.id },
      data: { receiver_status: BillingTransactionReceiverStatus.WITHDRAW_IN_PROCESS }
    });
    return { success: true };
  }

  /**
   * Cron: process WithdrawalRequest rows with status = pending. Call Razorpay payout, then set status to completed (success) or failed.
   */
  static async processWithdrawalRequests(): Promise<{ processed: number; failed: number; errors: string[] }> {
    const errors: string[] = [];
    let processed = 0;
    let failed = 0;
    const requests = await (prisma as any).withdrawalRequest.findMany({
      where: { status: WithdrawalRequestStatus.PENDING },
      include: {
        billing_transaction: { include: { currency: true } },
        withdrawal_method: true
      },
      orderBy: { withdrawal_trigger_at: 'asc' }
    });
    for (const req of requests) {
      const tx = req.billing_transaction;
      const method = req.withdrawal_method;
      if (!tx || !method) {
        errors.push(`WithdrawalRequest ${req.id}: missing transaction or method`);
        failed++;
        continue;
      }
      const fundAccountId = (method as any).razorpay_fund_account_id;
      if (!fundAccountId) {
        errors.push(`WithdrawalRequest ${req.id}: bank not verified (no razorpay_fund_account_id)`);
        failed++;
        continue;
      }
      const amountPaise = Math.round(parseFloat(String(tx.receiver_amount ?? tx.amount)) * 100);
      if (amountPaise <= 0) {
        errors.push(`WithdrawalRequest ${req.id}: invalid amount`);
        failed++;
        continue;
      }
      try {
        await (prisma as any).withdrawalRequest.update({
          where: { id: req.id },
          data: { status: WithdrawalRequestStatus.PROCESSING }
        });
        // TODO: Call razorpayService.createPayout(fundAccountId, amountPaise, ...) when implemented
        if (isRazorpayConfigured()) {
          // Payout logic will live in @services/razorpayService
        }
        const now = new Date();
        await (prisma as any).withdrawalRequest.update({
          where: { id: req.id },
          data: { status: WithdrawalRequestStatus.COMPLETED, processed_at: now }
        });
        await (prisma as any).billingTransaction.update({
          where: { id: tx.id },
          data: { receiver_status: BillingTransactionReceiverStatus.PAID_OUT }
        });
        processed++;
      } catch (err: any) {
        const msg = err?.message ?? String(err);
        await (prisma as any).withdrawalRequest.update({
          where: { id: req.id },
          data: { status: WithdrawalRequestStatus.FAILED, processed_at: new Date(), error_message: msg.slice(0, 500) }
        });
        errors.push(`WithdrawalRequest ${req.id}: ${msg}`);
        failed++;
      }
    }
    return { processed, failed, errors };
  }

  /** Webhook: set receiver_status to released and create receiver invoice. */
  static async setReceiverReleased(transactionUniqueId: string): Promise<{ success: boolean; message?: string }> {
    const tx = await prisma.billingTransaction.findUnique({
      where: { unique_id: transactionUniqueId }
    });
    if (!tx) return { success: false, message: 'Transaction not found' };
    if (tx.type !== BillingTransactionType.PAYMENT) return { success: false, message: 'Not a payment transaction' };
    await (prisma as any).billingTransaction.update({
      where: { id: tx.id },
      data: { receiver_status: BillingTransactionReceiverStatus.RELEASED }
    });
    await this.createInvoicesForTransaction(tx.id, { payer: false, receiver: true });
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
    const activeTab = data.activeTab;
    const individualPAN = data.individualPAN?.trim().toUpperCase() || null;
    const individualGSTIN = data.individualHasGSTIN ? data.individualGSTIN?.trim().toUpperCase() || null : null;
    const agencyPAN = data.agencyPAN?.trim().toUpperCase() || null;
    const agencyGSTIN = data.agencyHasGSTIN ? data.agencyGSTIN?.trim().toUpperCase() || null : null;
    const activePanNumber = activeTab === 'AGENCY' ? agencyPAN : individualPAN;
    const activeGSTIN = activeTab === 'AGENCY' ? agencyGSTIN : individualGSTIN;
    const activeHasGSTIN = activeTab === 'AGENCY' ? !!agencyGSTIN : !!individualGSTIN;

    if (activeTab === 'AGENCY') {
      const user = await prisma.user.findUnique({
        where: { id: userIdNum },
        select: {
          agency_verification_status: true
        }
      });

      if (user?.agency_verification_status !== 'APPROVED') {
        throw new Error("You need to verify your agency before saving agency tax details");
      }
    }

    // Check if GSTIN values changed to reset verification status
    const existing = await prisma.taxInformation.findUnique({ where: { user_id: userIdNum } });
    const individualGstinChanged = individualGSTIN && individualGSTIN !== existing?.individual_gstin;
    const agencyGstinChanged = agencyGSTIN && agencyGSTIN !== existing?.agency_gstin;

    const taxInfo = await prisma.taxInformation.upsert({
      where: { user_id: userIdNum },
      update: {
        tax_residence: data.taxResidence,
        entity_type: activeTab,
        pan_number: activePanNumber,
        individual_pan: individualPAN,
        individual_gstin: individualGSTIN,
        agency_pan: agencyPAN,
        agency_gstin: agencyGSTIN,
        has_gstin: activeHasGSTIN,
        gstin: activeGSTIN,
        // Set GSTIN verification to IN_REVIEW when a new GSTIN is submitted
        ...(individualGstinChanged ? {
          individual_gstin_status: individualGSTIN ? 'IN_REVIEW' : 'PENDING',
          individual_gstin_verified_at: null,
          individual_gstin_failure_reason: null,
          individual_gstin_api_response: Prisma.DbNull,
        } : {}),
        ...(agencyGstinChanged ? {
          agency_gstin_status: agencyGSTIN ? 'IN_REVIEW' : 'PENDING',
          agency_gstin_verified_at: null,
          agency_gstin_failure_reason: null,
          agency_gstin_api_response: Prisma.DbNull,
        } : {}),
        updated_at: new Date()
      },
      create: {
        user_id: userIdNum,
        tax_residence: data.taxResidence,
        entity_type: activeTab,
        pan_number: activePanNumber,
        individual_pan: individualPAN,
        individual_gstin: individualGSTIN,
        agency_pan: agencyPAN,
        agency_gstin: agencyGSTIN,
        has_gstin: activeHasGSTIN,
        gstin: activeGSTIN,
        individual_gstin_status: individualGSTIN ? 'IN_REVIEW' : 'PENDING',
        agency_gstin_status: agencyGSTIN ? 'IN_REVIEW' : 'PENDING',
      }
    });

    return {
      success: true,
      message: "Tax information saved successfully",
      data: {
        id: taxInfo.id,
        taxResidence: taxInfo.tax_residence,
        activeTab: taxInfo.entity_type === 'AGENCY' ? 'AGENCY' : 'INDIVIDUAL',
        individualPAN: taxInfo.individual_pan || taxInfo.pan_number || '',
        individualHasGSTIN: !!(taxInfo.individual_gstin || (taxInfo.entity_type !== 'AGENCY' && taxInfo.gstin)),
        individualGSTIN: taxInfo.individual_gstin || (taxInfo.entity_type !== 'AGENCY' ? taxInfo.gstin || '' : ''),
        individualGstinStatus: taxInfo.individual_gstin_status || 'PENDING',
        individualGstinFailureReason: taxInfo.individual_gstin_failure_reason || null,
        agencyPAN: taxInfo.agency_pan || (taxInfo.entity_type === 'AGENCY' ? taxInfo.pan_number || '' : ''),
        agencyHasGSTIN: !!(taxInfo.agency_gstin || (taxInfo.entity_type === 'AGENCY' && taxInfo.gstin)),
        agencyGSTIN: taxInfo.agency_gstin || (taxInfo.entity_type === 'AGENCY' ? taxInfo.gstin || '' : ''),
        agencyGstinStatus: taxInfo.agency_gstin_status || 'PENDING',
        agencyGstinFailureReason: taxInfo.agency_gstin_failure_reason || null,
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
        activeTab: taxInfo.entity_type === 'AGENCY' ? 'AGENCY' : 'INDIVIDUAL',
        individualPAN: taxInfo.individual_pan || taxInfo.pan_number || '',
        individualHasGSTIN: !!(taxInfo.individual_gstin || (taxInfo.entity_type !== 'AGENCY' && taxInfo.gstin)),
        individualGSTIN: taxInfo.individual_gstin || (taxInfo.entity_type !== 'AGENCY' ? taxInfo.gstin || '' : ''),
        individualGstinStatus: taxInfo.individual_gstin_status || 'PENDING',
        individualGstinFailureReason: taxInfo.individual_gstin_failure_reason || null,
        agencyPAN: taxInfo.agency_pan || (taxInfo.entity_type === 'AGENCY' ? taxInfo.pan_number || '' : ''),
        agencyHasGSTIN: !!(taxInfo.agency_gstin || (taxInfo.entity_type === 'AGENCY' && taxInfo.gstin)),
        agencyGSTIN: taxInfo.agency_gstin || (taxInfo.entity_type === 'AGENCY' ? taxInfo.gstin || '' : ''),
        agencyGstinStatus: taxInfo.agency_gstin_status || 'PENDING',
        agencyGstinFailureReason: taxInfo.agency_gstin_failure_reason || null,
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

    // creditsOnly (My Earning): only where user is receiver (to_id) and amount >= 0; exclude withdrawal.
    const baseWhere: any = creditsOnly
      ? { to_id: userIdNum, amount: { gte: 0 }, type: { notIn: [BillingTransactionType.WITHDRAWAL] } }
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
          const clientName = counterpartyId === 0 ? 'Platform' : (nameByUserId[counterpartyId] ?? '—');
          const payerInv = t.payer_invoice;
          const receiverInv = t.receiver_invoice;
          const invoiceUrlLegacy = t.invoice_url;
          const invoiceUrl = isCredit ? (receiverInv?.file_url ?? invoiceUrlLegacy) : (payerInv?.file_url ?? invoiceUrlLegacy);
          const baseAmt = parseFloat(t.amount?.toString() ?? '0');
          const isFirstMilestone = (t.meta as Record<string, string> | null)?.milestone_index !== undefined
            ? (t.meta as Record<string, string>).milestone_index === '0'
            : true;
          const computed = t.type === BillingTransactionType.PAYMENT ? this.getPayerAndReceiverAmounts(baseAmt, isFirstMilestone) : null;
          const payerAmt = t.payer_amount != null ? parseFloat(t.payer_amount.toString()) : (computed?.payerAmount ?? baseAmt);
          const receiverAmt = t.receiver_amount != null ? parseFloat(t.receiver_amount.toString()) : (computed?.receiverAmount ?? baseAmt);
          return {
            id: t.id,
            uniqueId: t.unique_id,
            amount: baseAmt,
            payerAmount: payerAmt,
            receiverAmount: receiverAmt,
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

  // Get user's balance and billing totals (from UserWallet; fallback aggregate for users without row)
  static async getUserBalance(userId: string) {
    const userIdNum = parseInt(userId);
    const wallet = await (prisma as any).userWallet.findUnique({
      where: { user_id: userIdNum },
      select: { total_earning: true, total_withdrawal: true, wallet_amount: true, pending_amount: true }
    }) as { total_earning?: unknown; total_withdrawal?: unknown; wallet_amount?: unknown; pending_amount?: unknown } | null;

    let totalEarning = 0;
    let totalWithdrawal = 0;
    let walletAmount = 0;
    let pendingAmount = 0;

    if (wallet) {
      totalEarning = Number(wallet.total_earning ?? 0);
      totalWithdrawal = Number(wallet.total_withdrawal ?? 0);
      walletAmount = Number(wallet.wallet_amount ?? 0);
      pendingAmount = Number(wallet.pending_amount ?? 0);
    } else {
      const [credits, debits, withdrawals, pendingCredits] = await Promise.all([
        prisma.billingTransaction.aggregate({
          where: { to_id: userIdNum, status: BillingTransactionStatus.COMPLETED },
          _sum: { amount: true }
        }),
        prisma.billingTransaction.aggregate({
          where: { from_id: userIdNum, status: BillingTransactionStatus.COMPLETED },
          _sum: { amount: true }
        }),
        prisma.billingTransaction.aggregate({
          where: { from_id: userIdNum, type: BillingTransactionType.WITHDRAWAL, status: BillingTransactionStatus.COMPLETED },
          _sum: { amount: true }
        }),
        prisma.billingTransaction.aggregate({
          where: { to_id: userIdNum, status: BillingTransactionStatus.PENDING },
          _sum: { amount: true }
        })
      ]);
      totalEarning = Number(credits._sum?.amount || 0);
      totalWithdrawal = Number(withdrawals._sum?.amount || 0);
      walletAmount = Number(credits._sum?.amount || 0) - Number(debits._sum?.amount || 0);
      pendingAmount = Number(pendingCredits._sum?.amount || 0);
      // Backfill wallet row for next time
      await this.ensureUserWallet(userIdNum);
      await (prisma as any).userWallet.update({
        where: { user_id: userIdNum },
        data: {
          wallet_amount: walletAmount,
          total_earning: totalEarning,
          total_withdrawal: totalWithdrawal,
          pending_amount: pendingAmount,
        },
      });
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

  // ----- Withdrawal methods (freelancer only): single bank account per user -----

  static async getWithdrawalMethods(userId: string) {
    const userIdNum = parseInt(userId);
    const methods = await (prisma as any).withdrawalMethod.findMany({
      where: { user_id: userIdNum },
      orderBy: { created_at: 'desc' }
    });
    return {
      success: true,
      data: methods.map((m: any) => ({
        id: m.id,
        uniqueId: m.unique_id,
        type: m.type,
        displayLabel: m.display_label,
        bankName: m.bank_name,
        accountNumberLast4: m.account_number_last4,
        ifsc: m.ifsc,
        verificationStatus: m.verification_status ?? 'pending',
        verificationFailureReason: m.verification_failure_reason ?? null,
        createdAt: m.created_at
      }))
    };
  }

  static async createWithdrawalMethod(
    userId: string,
    data: { type?: string; displayLabel: string; bankName?: string; accountNumber?: string; accountNumberLast4?: string; ifsc?: string; isDefault?: boolean }
  ) {
    const userIdNum = parseInt(userId);
    if (data.type && data.type !== 'bank_account') {
      return { success: false, message: 'Only bank account is supported. UPI is not available.' };
    }
    if (!data.accountNumber?.trim()) {
      return { success: false, message: 'Bank account number is required' };
    }
    const ifsc = (data.ifsc || '').trim().toUpperCase();
    if (!ifsc || !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) {
      return { success: false, message: 'Valid IFSC is required (e.g. HDFC0001234)' };
    }
    const existing = await (prisma as any).withdrawalMethod.findFirst({
      where: { user_id: userIdNum }
    });
    if (existing) {
      return { success: false, message: 'You already have bank information. Remove it first to add new details.' };
    }
    const accountNumber = data.accountNumber.replace(/\D/g, '').trim() || null;
    const accountNumberLast4 = accountNumber ? accountNumber.slice(-4) : (data.accountNumberLast4?.replace(/\D/g, '').slice(-4) || null);
    const method = await (prisma as any).withdrawalMethod.create({
      data: {
        user_id: userIdNum,
        type: 'bank_account',
        display_label: data.displayLabel,
        bank_name: data.bankName ?? null,
        account_number: accountNumber,
        account_number_last4: accountNumberLast4,
        ifsc,
        verification_status: 'pending'
      }
    });
    return {
      success: true,
      message: 'Bank details submitted. Verification is in process.',
      data: {
        id: method.id,
        uniqueId: method.unique_id,
        type: method.type,
        displayLabel: method.display_label,
        bankName: method.bank_name,
        accountNumberLast4: method.account_number_last4,
        ifsc: method.ifsc,
        verificationStatus: 'pending',
        createdAt: method.created_at
      }
    };
  }

  static async deleteWithdrawalMethod(userId: string, methodId: string) {
    const userIdNum = parseInt(userId);
    const methodIdNum = parseInt(methodId);
    const method = await (prisma as any).withdrawalMethod.findFirst({
      where: { id: methodIdNum, user_id: userIdNum }
    });
    if (method) {
      await (prisma as any).user.update({
        where: { id: userIdNum },
        data: { razorpay_account_id: null }
      });
    }
    await (prisma as any).withdrawalMethod.deleteMany({
      where: { id: methodIdNum, user_id: userIdNum }
    });
    return { success: true, message: 'Withdrawal method removed' };
  }

  /** Resubmit bank for verification after a failed attempt. Clears failure reason and sets status to pending. */
  static async resubmitForVerification(userId: string): Promise<{ success: boolean; message: string; data?: any }> {
    const userIdNum = parseInt(userId);
    const method = await (prisma as any).withdrawalMethod.findFirst({
      where: { user_id: userIdNum }
    });
    if (!method) {
      return { success: false, message: 'No bank account found. Add bank details first.' };
    }
    if (method.verification_status !== 'failed') {
      return { success: false, message: 'Only failed verification can be resubmitted.' };
    }
    await prisma.$executeRaw`
      UPDATE scd_withdrawal_methods
      SET verification_status = 'pending', verification_failure_reason = NULL, updated_at = NOW()
      WHERE id = ${method.id} AND user_id = ${userIdNum}
    `;
    return {
      success: true,
      message: 'Resubmitted for verification. We will verify your bank account shortly.',
      data: {
        id: method.id,
        verificationStatus: 'pending',
        verificationFailureReason: null,
      }
    };
  }

  /** Update bank details when verification failed; sets status back to pending so cron can re-verify. */
  static async updateWithdrawalMethod(
    userId: string,
    methodId: string,
    data: { displayLabel?: string; bankName?: string; accountNumber?: string; ifsc?: string }
  ): Promise<{ success: boolean; message: string; data?: any }> {
    const userIdNum = parseInt(userId);
    const methodIdNum = parseInt(methodId);
    const method = await (prisma as any).withdrawalMethod.findFirst({
      where: { id: methodIdNum, user_id: userIdNum }
    });
    if (!method) {
      return { success: false, message: 'Withdrawal method not found.' };
    }
    if (method.verification_status !== 'failed') {
      return { success: false, message: 'Only failed bank details can be edited. Remove and add again to change verified method.' };
    }
    const ifsc = data.ifsc != null ? String(data.ifsc).trim().toUpperCase() : method.ifsc;
    if (ifsc && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) {
      return { success: false, message: 'Valid IFSC is required (e.g. HDFC0001234)' };
    }
    const accountNumber = data.accountNumber != null ? data.accountNumber.replace(/\D/g, '').trim() : method.account_number;
    if (!accountNumber || accountNumber.length < 9) {
      return { success: false, message: 'Valid account number (at least 9 digits) is required.' };
    }
    const accountNumberLast4 = accountNumber.slice(-4);
    const displayLabel = data.displayLabel?.trim() ?? method.display_label;
    const bankName = data.bankName?.trim() ?? method.bank_name;
    await prisma.$executeRaw`
      UPDATE scd_withdrawal_methods
      SET display_label = ${displayLabel}, bank_name = ${bankName}, account_number = ${accountNumber},
          account_number_last4 = ${accountNumberLast4}, ifsc = ${ifsc},
          verification_status = 'pending', verification_failure_reason = NULL, updated_at = NOW()
      WHERE id = ${methodIdNum} AND user_id = ${userIdNum}
    `;
    const updated = await (prisma as any).withdrawalMethod.findUnique({
      where: { id: methodIdNum }
    });
    return {
      success: true,
      message: 'Bank details updated. Verification is in process.',
      data: updated ? {
        id: updated.id,
        type: updated.type,
        displayLabel: updated.display_label,
        bankName: updated.bank_name,
        accountNumberLast4: updated.account_number_last4,
        ifsc: updated.ifsc,
        verificationStatus: 'pending',
        verificationFailureReason: null,
        createdAt: updated.created_at
      } : undefined
    };
  }

  /**
   * Cron: verify pending bank accounts via Razorpay X (contact + fund account).
   * Updates WithdrawalMethod.razorpay_fund_account_id and verification_status; User.razorpay_account_id.
   */
  static async verifyPendingBankAccounts(): Promise<{ verified: number; failed: number; errors: string[] }> {
    const result = { verified: 0, failed: 0, errors: [] as string[] };
    if (!isRazorpayConfigured()) {
      result.errors.push("Razorpay not configured");
      return result;
    }
    const pending = await (prisma as any).withdrawalMethod.findMany({
      where: { verification_status: "pending", type: "bank_account" },
      include: {
        user: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            phone: true,
            razorpay_contact_id: true,
          },
        },
      }
    });
    for (const method of pending) {
      const accountNumber = (method.account_number || "").trim();
      const ifsc = (method.ifsc || "").trim().toUpperCase();
      if (!accountNumber || accountNumber.length < 9 || !ifsc || !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) {
        const reason = "Missing or invalid account number or IFSC. Please check and resubmit.";
        await (prisma as any).withdrawalMethod.update({
          where: { id: method.id },
          data: { verification_status: "failed", verification_failure_reason: reason }
        });
        result.failed++;
        result.errors.push(`WithdrawalMethod ${method.id}: missing or invalid account_number/ifsc`);
        continue;
      }
      const u = method.user;
      const name = [u?.first_name, u?.last_name].filter(Boolean).join(" ").trim() || method.display_label || "Account Holder";
      const email = (u?.email || "").trim() || `user-${method.user_id}@scaledux.placeholder`;
      const contact = (u?.phone || "").replace(/\D/g, "").slice(-10) || "0000000000";
      try {
        const existingContactId = (u as any).razorpay_contact_id ?? null;
        const { contactId, fundAccountId } = await createContactAndFundAccount({
          name,
          email,
          contact,
          ifsc,
          accountNumber,
          existingContactId: existingContactId || undefined,
          validateBeneficiaryName: true,
        });
        await (prisma as any).withdrawalMethod.update({
          where: { id: method.id },
          data: {
            razorpay_fund_account_id: fundAccountId,
            verification_status: "verified",
            verification_failure_reason: null,
          }
        });
        await (prisma as any).user.update({
          where: { id: method.user_id },
          data: {
            razorpay_account_id: fundAccountId,
            ...(contactId && !existingContactId ? { razorpay_contact_id: contactId } : {}),
          }
        });
        result.verified++;
      } catch (err: any) {
        const msg = err?.response?.data?.error?.description || err?.message || "Unknown error";
        const reason = String(msg).slice(0, 500);
        await (prisma as any).withdrawalMethod.update({
          where: { id: method.id },
          data: { verification_status: "failed", verification_failure_reason: reason }
        }).catch(() => {});
        result.failed++;
        result.errors.push(`WithdrawalMethod ${method.id}: ${msg}`);
      }
    }
    return result;
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

  /** Create payer and/or receiver Invoice rows. Receiver invoice only when receiver withdraws and is released (e.g. via webhook). */
  static async createInvoicesForTransaction(
    transactionId: number,
    options?: { payer?: boolean; receiver?: boolean }
  ) {
    const { payer: createPayer = true, receiver: createReceiver = true } = options ?? {};
    const transaction = await (prisma as any).billingTransaction.findUnique({
      where: { id: transactionId },
      include: { currency: true, payer_invoice: true, receiver_invoice: true }
    });
    if (!transaction || transaction.type !== BillingTransactionType.PAYMENT) return;
    if (!createPayer && !createReceiver) return;
    if (createPayer && transaction.payer_invoice && createReceiver && transaction.receiver_invoice) return;

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
    const amount = parseFloat(transaction.amount.toString());
    const currencyCode = transaction.currency?.code ?? 'INR';
    const meta = transaction.meta ?? undefined;

    const platformGst = appConfig.platformGstNumber;
    const gstPercent = appConfig.gstPercent / 100;
    const isFirstMilestone = (transaction.meta as Record<string, string> | null)?.milestone_index !== undefined
      ? (transaction.meta as Record<string, string>).milestone_index === '0'
      : true;
    const appFeeFounder = isFirstMilestone ? appConfig.appFeeFounder : 0;
    const gstOnAppFee = Math.round(appFeeFounder * gstPercent * 100) / 100;
    const serviceFeePercent = appConfig.serviceFeePercent / 100;
    const serviceCharge = Math.round(amount * serviceFeePercent * 100) / 100;
    const gstOnServiceCharge = Math.round(serviceCharge * gstPercent * 100) / 100;

    const taxInfos = await (prisma as any).taxInformation.findMany({
      where: { user_id: { in: [transaction.from_id, transaction.to_id] } },
      select: { user_id: true, has_gstin: true, gstin: true }
    });
    const senderGst = taxInfos.find((t: any) => t.user_id === transaction.from_id && t.has_gstin && t.gstin)?.gstin ?? null;
    const receiverGst = taxInfos.find((t: any) => t.user_id === transaction.to_id && t.has_gstin && t.gstin)?.gstin ?? null;

    const invoiceNumberFor = (billingId: number, invoiceId: number) =>
      `INV-${billingId}-${invoiceId}-${String(Math.floor(Math.random() * 100)).padStart(2, '0')}`;

    let payerInvoiceId = transaction.payer_invoice?.id ?? null;
    let receiverInvoiceId = transaction.receiver_invoice?.id ?? null;
 
    if (createPayer && !payerInvoiceId) {
      const payerInv = await (prisma as any).invoice.create({
        data: {
          billing_transaction_id: transactionId,
          party: 'payer',
          sender_name: senderName,
          receiver_name: receiverName,
          amount,
          currency_code: currencyCode,
          description: transaction.description,
          invoice_number: `INV-${transactionId}-P-${Date.now()}`,
          gst_number: platformGst,
          sender_gst: senderGst,
          receiver_gst: receiverGst,
          fee: appFeeFounder,
          gst_amount: gstOnAppFee,
          meta
        }
      });
      const finalPayerNumber = invoiceNumberFor(transactionId, payerInv.id);
      await (prisma as any).invoice.update({
        where: { id: payerInv.id },
        data: { invoice_number: finalPayerNumber }
      });
      payerInvoiceId = payerInv.id;
    }
    if (createReceiver && !receiverInvoiceId) {
      const receiverInv = await (prisma as any).invoice.create({
        data: {
          billing_transaction_id: transactionId,
          party: 'receiver',
          sender_name: senderName,
          receiver_name: receiverName,
          amount,
          currency_code: currencyCode,
          description: transaction.description,
          invoice_number: `INV-${transactionId}-R-${Date.now()}`,
          gst_number: platformGst,
          sender_gst: senderGst,
          receiver_gst: receiverGst,
          fee: serviceCharge,
          gst_amount: gstOnServiceCharge,
          meta
        }
      });
      const finalReceiverNumber = invoiceNumberFor(transactionId, receiverInv.id);
      await (prisma as any).invoice.update({
        where: { id: receiverInv.id },
        data: { invoice_number: finalReceiverNumber }
      });
      receiverInvoiceId = receiverInv.id;
    }

    const updateData: Record<string, number> = {};
    if (!transaction.payer_invoice_id && payerInvoiceId) updateData.payer_invoice_id = payerInvoiceId;
    if (!transaction.receiver_invoice_id && receiverInvoiceId) updateData.receiver_invoice_id = receiverInvoiceId;
    if (Object.keys(updateData).length > 0) {
      await (prisma as any).billingTransaction.update({
        where: { id: transactionId },
        data: updateData
      });
    }
  }

  /** Get invoice data for client-side PDF. Uses existing Invoice (created at payment time); fallback create for legacy. */
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
    if (!invoice && isPayer) {
      await this.createInvoicesForTransaction(transaction.id, { receiver: false });
      const refreshed = await (prisma as any).billingTransaction.findUnique({
        where: { id: transaction.id },
        include: { payer_invoice: true, receiver_invoice: true }
      });
      invoice = refreshed?.payer_invoice ?? null;
    }
    if (!invoice) return { success: false as const, message: 'Invoice not found' };
    const inv = invoice as any;
    const platformGstForResponse = inv.gst_number ?? inv.platform_gst ?? (appConfig.platformGstNumber ?? undefined);
    return {
      success: true as const,
      data: {
        uniqueId: transaction.unique_id,
        invoiceNumber: invoice.invoice_number,
        party,
        gstNumber: platformGstForResponse,
        platformGst: inv.platform_gst ?? undefined,
        senderGst: inv.sender_gst ?? undefined,
        receiverGst: inv.receiver_gst ?? undefined,
        fee: inv.fee != null ? parseFloat(inv.fee.toString()) : undefined,
        gstAmount: inv.gst_amount != null ? parseFloat(inv.gst_amount.toString()) : undefined,
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
      include: {
        currency: true,
        payer_invoice: { select: { id: true, file_url: true } },
        receiver_invoice: { select: { id: true, file_url: true } },
        withdrawal_request: { select: { status: true } }
      }
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
    const baseAmount = parseFloat(transaction.amount.toString());
    const tAny = transaction as any;
    const isFirstMilestone = metaMap.milestone_index !== undefined ? metaMap.milestone_index === '0' : true;
    const computed = tAny.type === BillingTransactionType.PAYMENT ? this.getPayerAndReceiverAmounts(baseAmount, isFirstMilestone) : null;
    const payerAmt = tAny.payer_amount != null ? parseFloat(tAny.payer_amount.toString()) : (computed?.payerAmount ?? baseAmount);
    const receiverAmt = tAny.receiver_amount != null ? parseFloat(tAny.receiver_amount.toString()) : (computed?.receiverAmount ?? baseAmount);
    const wr = (transaction as any).withdrawal_request;
    const withdrawalStatusRaw = wr?.status ?? null;
    const withdrawalStatus = withdrawalStatusRaw === WithdrawalRequestStatus.COMPLETED ? 'success' : withdrawalStatusRaw;
    const base: any = {
      id: transaction.id,
      uniqueId: transaction.unique_id,
      amount: baseAmount,
      payerAmount: payerAmt,
      receiverAmount: receiverAmt,
      currency: transaction.currency?.code || 'INR',
      currencySymbol: transaction.currency?.symbol || '₹',
      type: transaction.type,
      status: transaction.status,
      senderStatus: transaction.sender_status ?? transaction.status,
      receiverStatus: transaction.receiver_status ?? transaction.status,
      withdrawalStatus: withdrawalStatus ?? null,
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
      milestonePayments: undefined as any[] | undefined
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
        if ((transaction as any).type === BillingTransactionType.PAYMENT) {
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
            base.milestonePayments.push({
              milestoneIndex: (row.order_index ?? 0) + 1,
              title: row.title ?? row.description ?? `Milestone ${(row.order_index ?? 0) + 1}`,
              amount: parseFloat(String(row.amount)),
              paid: true,
              transactionUniqueId: transaction.unique_id,
              date: transaction.created_at
            });
          }
        }
      }
    }

    return { success: true, data: base };
  }

  /**
   * Cron job: Verify pending GSTIN numbers via IDtoAI API.
   * Picks up TaxInformation rows with individual_gstin_status or agency_gstin_status = 'IN_REVIEW',
   * calls the IDtoAI API, checks address match, and updates status.
   */
  static async verifyPendingGSTINs(): Promise<{ verified: number; failed: number; errors: string[] }> {
    const result = { verified: 0, failed: 0, errors: [] as string[] };

    try {
      // Find all tax records with GSTIN pending verification
      const pendingRecords = await prisma.taxInformation.findMany({
        where: {
          OR: [
            { individual_gstin_status: 'IN_REVIEW', individual_gstin: { not: null } },
            { agency_gstin_status: 'IN_REVIEW', agency_gstin: { not: null } },
          ]
        }
      });

      for (const record of pendingRecords) {
        const taxResidence = record.tax_residence as { city?: string; zipCode?: string; state?: string } | null;

        // Verify individual GSTIN
        if (record.individual_gstin_status === 'IN_REVIEW' && record.individual_gstin) {
          try {
            const apiResult = await verifyGSTIN(record.individual_gstin);

            if (!apiResult.success) {
              await prisma.taxInformation.update({
                where: { id: record.id },
                data: {
                  individual_gstin_status: 'FAILED',
                  individual_gstin_failure_reason: apiResult.error || 'Verification API error',
                  individual_gstin_api_response: apiResult.raw ?? Prisma.DbNull,
                }
              });
              result.failed++;
              continue;
            }

            // Check registration status
            if (apiResult.current_registration_status !== 'Active') {
              await prisma.taxInformation.update({
                where: { id: record.id },
                data: {
                  individual_gstin_status: 'FAILED',
                  individual_gstin_failure_reason: `GSTIN registration is not active (status: ${apiResult.current_registration_status})`,
                  individual_gstin_api_response: apiResult.raw ?? Prisma.DbNull,
                }
              });
              result.failed++;
              continue;
            }

            // Check address match
            const addressCheck = matchAddress(apiResult.primary_business_address, taxResidence || {});
            if (!addressCheck.matches) {
              await prisma.taxInformation.update({
                where: { id: record.id },
                data: {
                  individual_gstin_status: 'FAILED',
                  individual_gstin_failure_reason: `Address mismatch: ${addressCheck.reason}`,
                  individual_gstin_api_response: apiResult.raw ?? Prisma.DbNull,
                }
              });
              result.failed++;
              continue;
            }

            // All checks passed
            await prisma.taxInformation.update({
              where: { id: record.id },
              data: {
                individual_gstin_status: 'VERIFIED',
                individual_gstin_verified_at: new Date(),
                individual_gstin_failure_reason: null,
                individual_gstin_api_response: apiResult.raw || null,
              }
            });
            result.verified++;
          } catch (err: any) {
            result.errors.push(`Individual GSTIN ${record.individual_gstin}: ${err.message}`);
            result.failed++;
          }
        }

        // Verify agency GSTIN
        if (record.agency_gstin_status === 'IN_REVIEW' && record.agency_gstin) {
          try {
            const apiResult = await verifyGSTIN(record.agency_gstin);

            if (!apiResult.success) {
              await prisma.taxInformation.update({
                where: { id: record.id },
                data: {
                  agency_gstin_status: 'FAILED',
                  agency_gstin_failure_reason: apiResult.error || 'Verification API error',
                  agency_gstin_api_response: apiResult.raw ?? Prisma.DbNull,
                }
              });
              result.failed++;
              continue;
            }

            if (apiResult.current_registration_status !== 'Active') {
              await prisma.taxInformation.update({
                where: { id: record.id },
                data: {
                  agency_gstin_status: 'FAILED',
                  agency_gstin_failure_reason: `GSTIN registration is not active (status: ${apiResult.current_registration_status})`,
                  agency_gstin_api_response: apiResult.raw ?? Prisma.DbNull,
                }
              });
              result.failed++;
              continue;
            }

            const addressCheck = matchAddress(apiResult.primary_business_address, taxResidence || {});
            if (!addressCheck.matches) {
              await prisma.taxInformation.update({
                where: { id: record.id },
                data: {
                  agency_gstin_status: 'FAILED',
                  agency_gstin_failure_reason: `Address mismatch: ${addressCheck.reason}`,
                  agency_gstin_api_response: apiResult.raw ?? Prisma.DbNull,
                }
              });
              result.failed++;
              continue;
            }

            await prisma.taxInformation.update({
              where: { id: record.id },
              data: {
                agency_gstin_status: 'VERIFIED',
                agency_gstin_verified_at: new Date(),
                agency_gstin_failure_reason: null,
                agency_gstin_api_response: apiResult.raw ?? Prisma.DbNull,
              }
            });
            result.verified++;
          } catch (err: any) {
            result.errors.push(`Agency GSTIN ${record.agency_gstin}: ${err.message}`);
            result.failed++;
          }
        }
      }
    } catch (error: any) {
      Log.error("[verify-gstin] Fatal error", { error: error.message });
      result.errors.push(error.message);
    }

    return result;
  }

}

