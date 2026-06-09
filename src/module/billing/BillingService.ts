import { prisma } from "@services/prismaService";
import { Prisma } from "@prisma/client";
import { PaymentMethodInput, RazorpayVerificationInput } from "./BillingType";
import crypto from "crypto";
import Razorpay from "razorpay";
import razorpayConfig from "@config/razorpay";
import { appConfig } from "@config/app";
import { Log } from "@services/loggerService";
import { getPlatformFee, calcFounderTotal, calcFreelancerDeductions, calcFreelancerPayout, calcTransaction, calcBookingMentorPayout } from "@utils/feeCalculations";
import { getNextInvoiceNumber } from "@utils/invoiceNumbering";
import { convertToUserCurrency } from "@utils/currencyConverter";
import { createContactAndFundAccount, isRazorpayConfigured } from "@services/razorpayService";
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
  /** Payer amount (base + platform fee + GST) and receiver amount (base - all freelancer deductions). */
  private static getPayerAndReceiverAmounts(baseAmount: number, isGstRegistered: boolean = false): { payerAmount: number; receiverAmount: number } {
    const founder = calcFounderTotal(baseAmount);
    const freelancerPayout = calcFreelancerPayout(baseAmount, isGstRegistered);
    return { payerAmount: founder.totalClientPays, receiverAmount: freelancerPayout };
  }

  /**
   * Resolve order amount from milestone (server-side only). Validates user is project owner and payment is allowed.
   * Returns totalFounderPays and platformTransferAmount so frontend cannot modify amount.
   */
  static async getMilestoneOrderAmount(
    userId: number,
    milestoneId: number,
    milestoneIndexFromFrontend?: number
  ): Promise<{
    success: boolean;
    message?: string;
    totalFounderPays?: number;
    platformTransferAmountInr?: number;
    freelancerTransfer?: { accountId: string; amountInr: number };
  }> {
    const milestoneRow = await (prisma as any).milestone.findUnique({
      where: { id: milestoneId },
      include: {
        proposal: {
          include: {
            project: { select: { id: true, user_id: true } },
            milestonesRows: { orderBy: { order_index: 'asc' } },
            provider: { select: { id: true, razorpay_account_id: true, razorpay_agency_account_id: true, show_as_agency: true } }
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
    const founder = calcFounderTotal(amount);
    const platformTransferAmountInr = founder.platformFee + founder.platformFeeGst;

    // Check freelancer's Razorpay linked account for Route transfer (agency account if show_as_agency)
    const provider = proposal.provider;
    const freelancerAccountId = (provider?.show_as_agency && provider?.razorpay_agency_account_id)
      ? provider.razorpay_agency_account_id as string
      : provider?.razorpay_account_id as string | null;
    if (!freelancerAccountId) {
      return { success: false, message: 'Freelancer has not completed Razorpay account linking. Payment cannot proceed.' };
    }

    // Check if freelancer is GST registered (for TCS calculation)
    const taxInfo = await (prisma as any).taxInformation.findFirst({
      where: { user_id: proposal.provider.id },
      select: { has_gstin: true }
    });
    const isGstRegistered = taxInfo?.has_gstin === true;
    const netPayout = calcFreelancerPayout(amount, isGstRegistered);

    return {
      success: true,
      totalFounderPays: founder.totalClientPays,
      platformTransferAmountInr,
      freelancerTransfer: { accountId: freelancerAccountId, amountInr: netPayout }
    };
  }

  /**
   * Create Razorpay order. Amount is only accepted from client for card verification (amount 1).
   * For payment, use getMilestoneOrderAmount + this with server-computed amount so user cannot modify amount.
   */
  static async createVerificationOrder(
    userId: string,
    amount: number = 1,
    options?: {
      receiptPrefix?: string;
      notes?: Record<string, string>;
      freelancerTransfer?: { accountId: string; amountInr: number };
    }
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

    const orderPayload: {
      amount: number;
      currency: string;
      receipt: string;
      notes: Record<string, string>;
      transfers?: Array<{ account: string; amount: number; currency: string; on_hold: boolean; notes?: Record<string, string> }>;
    } = {
      amount: amountPaise,
      currency: 'INR',
      receipt: `${receiptPrefix}_${userId}_${Date.now()}`,
      notes
    };

    // Razorpay Route: transfer net payout to freelancer's linked account (on_hold)
    // ScaleDux keeps the remainder (platform fee + commission + GST + TCS)
    if (options?.freelancerTransfer) {
      const { accountId, amountInr } = options.freelancerTransfer;
      // Hold until manually released on founder acceptance; 90-day fallback so it never stays indefinite
      const onHoldUntil = Math.floor(Date.now() / 1000) + 90 * 24 * 60 * 60;
      orderPayload.transfers = [{
        account: accountId,
        amount: Math.round(amountInr * 100),
        currency: 'INR',
        on_hold: 1,
        on_hold_until: onHoldUntil,
        notes: { type: 'milestone_payout', ...notes }
      } as any];
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
      const razorpayError = error?.error?.description || error?.response?.data?.error?.description || error?.message || 'Failed to create order';
      Log.error('Razorpay order creation failed', { error: razorpayError, statusCode: error?.statusCode, raw: JSON.stringify(error?.error || error?.response?.data || {}) });
      return {
        success: false,
        message: razorpayError
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
   * Uses new fee structure: platform fee (flat/%) for founder, commission + processing fee + TCS for freelancer.
   */
  static getPaymentBreakdown(milestoneAmount?: number, isGstRegistered: boolean = false) {
    const config = {
      platformFeeType: appConfig.platformFeeType,
      platformFeeAmount: appConfig.platformFeeAmount,
      serviceFeePercent: appConfig.serviceFeePercent,
      processingFeePercent: appConfig.processingFeePercent,
      gstPercent: appConfig.gstPercent,
      tcsPercent: appConfig.tcsPercent,
    };
    if (milestoneAmount == null) return config;

    const tx = calcTransaction(milestoneAmount, isGstRegistered);
    return {
      ...config,
      milestoneAmount,
      platformFee: tx.platformFee,
      platformFeeGst: tx.platformFeeGst,
      totalFounderPays: tx.totalClientPays,
      commission: tx.commission,
      commissionGst: tx.commissionGst,
      processingFee: tx.processingFee,
      processingFeeGst: tx.processingFeeGst,
      tcs: tx.tcs,
      netToFreelancer: tx.freelancerPayout,
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
  static async ensureUserWallet(userId: number): Promise<void> {
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
    isGstRegistered?: boolean;
  }) {
    const { actorId, fromId, toId, subjectType, subjectId, amount, description, meta, status = BillingTransactionStatus.COMPLETED, milestoneId, isGstRegistered = false } = params;
    const currencyId = 1;

    // Calculate full fee breakdown
    const founder = calcFounderTotal(amount);
    const deductions = calcFreelancerDeductions(amount, isGstRegistered);
    const freelancerPayout = calcFreelancerPayout(amount, isGstRegistered);

    // When fund loaded (pending): sender = funded, receiver = pending
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
        payer_amount: founder.totalClientPays,
        receiver_amount: freelancerPayout,
        currency_id: currencyId,
        type: BillingTransactionType.PAYMENT,
        status,
        sender_status: senderStatus,
        receiver_status: receiverStatus,
        description,
        meta: meta ? (meta as object) : undefined,
        // Fee breakdown
        platform_fee_amount: founder.platformFee,
        platform_fee_gst: founder.platformFeeGst,
        commission_amount: deductions.commission,
        commission_gst: deductions.commissionGst,
        processing_fee_amount: deductions.processingFee,
        processing_fee_gst: deductions.processingFeeGst,
        tcs_amount: deductions.tcs,
        on_hold: status === BillingTransactionStatus.PENDING,
      }
    });

    if (status === BillingTransactionStatus.PENDING && toId > 0) {
      await this.ensureUserWallet(toId);
      await (prisma as any).userWallet.update({
        where: { user_id: toId },
        data: { pending_amount: { increment: amount } },
      });
    } else if (status === BillingTransactionStatus.COMPLETED) {
      await this.updateUserBillingTotalsAfterTransaction(BillingTransactionType.PAYMENT, BillingTransactionStatus.COMPLETED, fromId, toId, amount, freelancerPayout, freelancerPayout);
    }

    // Generate Invoice C (ScaleDux → Founder) with platform fee
    await this.createInvoiceC(row.id);

    // Store Razorpay Route transfer ID (for releasing hold on acknowledge)
    const razorpayPaymentId = (meta as Record<string, string>)?.razorpay_payment_id;
    if (razorpayPaymentId && razorpay) {
      try {
        const payment = await razorpay.payments.fetch(razorpayPaymentId, { 'expand[]': 'transfers' });
        const transferId = payment?.transfers?.items?.[0]?.id ?? null;
        if (transferId) {
          await (prisma as any).billingTransaction.update({
            where: { id: row.id },
            data: { razorpay_transfer_id: transferId }
          });
        }
      } catch (err) {
        Log.error('Failed to fetch Razorpay transfer ID', { err, paymentId: razorpayPaymentId });
      }
    }

    return { success: true, data: { transactionId: row.id, transactionUniqueId: row.unique_id } };
  }

  /**
   * Founder acknowledges milestone completion. Triggers Razorpay transfer and sets status to PAYMENT_PROCESSED.
   * Freelancer wallet is NOT credited here — that happens via the transfer.settled webhook.
   */
  static async acknowledgeMilestonePayment(transactionUniqueId: string, userId: number): Promise<{ success: boolean; message?: string }> {
    const tx = await (prisma as any).billingTransaction.findUnique({
      where: { unique_id: transactionUniqueId },
      include: { invoice_a: true }
    });
    if (!tx) return { success: false, message: 'Transaction not found' };
    if (tx.type !== BillingTransactionType.PAYMENT) return { success: false, message: 'Not a payment transaction' };
    if (tx.status !== BillingTransactionStatus.PENDING) return { success: false, message: 'Payment is not in funded state' };
    if (tx.from_id !== userId) return { success: false, message: 'Only the payer can acknowledge this payment' };
    if (!tx.invoice_a) return { success: false, message: 'Freelancer must send invoice first' };

    const amount = Number(tx.amount);
    const isGstRegistered = tx.tcs_amount != null && Number(tx.tcs_amount) > 0;
    const deductions = calcFreelancerDeductions(amount, isGstRegistered);
    const netPayout = calcFreelancerPayout(amount, isGstRegistered);

    // Generate Invoice B (ScaleDux → Freelancer, commission deduction)
    await this.createInvoiceB(tx.id);

    // Release Razorpay Route transfer hold → freelancer gets paid (T+2)
    if (tx.razorpay_transfer_id && razorpay) {
      try {
        await razorpay.transfers.edit(tx.razorpay_transfer_id, { on_hold: false });
      } catch (err: any) {
        Log.error('Failed to release Razorpay transfer hold', { err, transferId: tx.razorpay_transfer_id });
        return { success: false, message: 'Failed to release payment to freelancer. Please try again.' };
      }
    }

    // Mark as payment_processed; COMPLETED/RELEASED will be set via Razorpay webhook on settlement
    await (prisma as any).billingTransaction.update({
      where: { id: tx.id },
      data: {
        status: BillingTransactionStatus.PAYMENT_PROCESSED,
        sender_status: BillingTransactionSenderStatus.FUNDED,
        receiver_status: BillingTransactionReceiverStatus.PAYMENT_PROCESSED,
        on_hold: false,
      }
    });

    // Sync to chat
    const milestoneId = tx.milestone_id as number | null | undefined;
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

  /**
   * Razorpay webhook handler for transfer.settled. Credits freelancer wallet, sets status to PAID.
   */
  static async handleTransferSettled(transferId: string): Promise<{ success: boolean; message?: string }> {
    const tx = await (prisma as any).billingTransaction.findFirst({
      where: { razorpay_transfer_id: transferId }
    });
    if (!tx) {
      Log.warn('Webhook transfer.settled: no transaction found', { transferId });
      return { success: false, message: 'Transaction not found for transfer' };
    }
    if (tx.status === BillingTransactionStatus.COMPLETED) {
      return { success: true, message: 'Already processed' };
    }

    const amount = Number(tx.amount);
    let netPayout: number;
    if (tx.subject_type === 'Booking') {
      netPayout = calcBookingMentorPayout(amount);
    } else {
      const isGstRegistered = tx.tcs_amount != null && Number(tx.tcs_amount) > 0;
      netPayout = calcFreelancerPayout(amount, isGstRegistered);
    }

    // Only move wallet funds if not already moved (payment_processed means wallet was updated on approval)
    const walletAlreadyUpdated = tx.status === BillingTransactionStatus.PAYMENT_PROCESSED;

    await (prisma as any).billingTransaction.update({
      where: { id: tx.id },
      data: {
        status: BillingTransactionStatus.COMPLETED,
        sender_status: BillingTransactionSenderStatus.RELEASED,
        receiver_status: BillingTransactionReceiverStatus.RELEASED,
      }
    });

    // Credit wallet only if not already done during approval
    if (!walletAlreadyUpdated && tx.to_id > 0) {
      await this.ensureUserWallet(tx.to_id);
      await (prisma as any).userWallet.update({
        where: { user_id: tx.to_id },
        data: {
          pending_amount: { decrement: amount },
          wallet_amount: { increment: netPayout },
          total_earning: { increment: netPayout },
        },
      });
    }

    Log.info('Webhook transfer.settled processed', {
      transferId, txId: tx.id, uniqueId: tx.unique_id,
      subjectType: tx.subject_type, walletAlreadyUpdated,
    });

    return { success: true };
  }

  /**
   * Freelancer sends invoice (Invoice A) for a completed milestone.
   */
  static async sendFreelancerInvoice(freelancerId: number, milestoneId: number): Promise<{ success: boolean; message?: string }> {
    const milestone = await (prisma as any).milestone.findUnique({
      where: { id: milestoneId },
      include: {
        proposal: { include: { project: { select: { id: true, user_id: true, project_title: true } } } }
      }
    });
    if (!milestone) return { success: false, message: 'Milestone not found' };
    const proposal = milestone.proposal;
    if (!proposal) return { success: false, message: 'Proposal not found' };
    if (proposal.user_id !== freelancerId) return { success: false, message: 'You are not the freelancer on this contract' };

    // Find the billing transaction for this milestone
    const tx = await (prisma as any).billingTransaction.findFirst({
      where: { milestone_id: milestoneId, type: BillingTransactionType.PAYMENT, status: BillingTransactionStatus.PENDING }
    });
    if (!tx) return { success: false, message: 'No funded payment found for this milestone' };
    if (tx.invoice_a_id) return { success: false, message: 'Invoice already sent for this milestone' };

    await this.createInvoiceA(tx.id);

    // Notify founder
    const { dispatch } = await import('@queues/Queue');
    const { NotificationJob } = await import('../../jobs/NotificationJob');
    const { NotificationEmailJob } = await import('../../jobs/NotificationEmailJob');
    const freelancerName = await (async () => {
      const u = await prisma.user.findUnique({ where: { id: freelancerId }, select: { first_name: true, last_name: true } });
      return u ? [u.first_name, u.last_name].filter(Boolean).join(' ').trim() : 'Freelancer';
    })();

    const notifData = {
      userId: proposal.project.user_id,
      type: 'INVOICE_RECEIVED' as const,
      notificationTitle: 'Invoice received',
      notificationBody: `<p><strong>${freelancerName}</strong> has sent an invoice for milestone "${milestone.title || 'Milestone'}" on project "${proposal.project.project_title}".</p><p>Please review and acknowledge to release the payment.</p>`,
      notificationLink: `${appConfig.frontendUrl}/proposals-and-offers/${proposal.unique_id}`,
      actorId: freelancerId,
      subjectType: 'Proposal' as const,
      subjectId: proposal.id,
    };
    await dispatch(NotificationJob, notifData);
    await dispatch(NotificationEmailJob, notifData);

    return { success: true, message: 'Invoice sent' };
  }

  /** @deprecated Use acknowledgeMilestonePayment instead. Kept for backward compatibility. */
  static async releasePaymentTransaction(transactionUniqueId: string, userId: number): Promise<{ success: boolean; message?: string }> {
    return this.acknowledgeMilestonePayment(transactionUniqueId, userId);
  }

  /** Receiver requests payout: create WithdrawalRequest (status pending) and set transaction to withdraw_in_process. Cron will process. */
  static async setReceiverWithdrawInProcess(transactionUniqueId: string, userId: number, bankInformationId: number): Promise<{ success: boolean; message?: string }> {
    const tx = await (prisma as any).billingTransaction.findUnique({
      where: { unique_id: transactionUniqueId },
      include: { withdrawal_request: true }
    });
    if (!tx) return { success: false, message: 'Transaction not found' };
    if (tx.type !== BillingTransactionType.PAYMENT) return { success: false, message: 'Not a payment transaction' };
    if (tx.to_id !== userId) return { success: false, message: 'Only the receiver can request payout for this payment' };
    const current = (tx as any).receiver_status ?? tx.status;
    if (current !== BillingTransactionReceiverStatus.COMPLETED && current !== BillingTransactionReceiverStatus.RELEASED) {
      return { success: false, message: 'Payout can only be requested when receiver status is completed or released' };
    }
    const method = await (prisma as any).bankInformation.findFirst({
      where: { id: bankInformationId, user_id: tx.to_id }
    });
    if (!method) return { success: false, message: 'Bank information not found or does not belong to you' };
    if ((tx as any).withdrawal_request) return { success: false, message: 'Payout already requested for this payment' };
    await (prisma as any).withdrawalRequest.create({
      data: {
        user_id: tx.to_id,
        withdrawal_method_id: bankInformationId,
        billing_transaction_id: tx.id,
        status: WithdrawalRequestStatus.PENDING
      }
    });
    await (prisma as any).billingTransaction.update({
      where: { id: tx.id },
      data: { receiver_status: 'withdraw_in_process' }
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

  // Tax information — delegated to TaxInformationService
  static async saveTaxInformation(userId: string, data: any) {
    const { TaxInformationService } = require("@module/tax-information/TaxInformationService");
    return TaxInformationService.saveTaxInformation(userId, data);
  }
  static async getTaxInformation(userId: string) {
    const { TaxInformationService } = require("@module/tax-information/TaxInformationService");
    return TaxInformationService.getTaxInformation(userId);
  }
  // Bank information — delegated to BankInformationService
  static async getBankInformation(userId: string) {
    const { BankInformationService } = require("@module/bank-information/BankInformationService");
    return BankInformationService.getBankInformation(userId);
  }
  static async createBankInformation(userId: string, data: any) {
    const { BankInformationService } = require("@module/bank-information/BankInformationService");
    return BankInformationService.createBankInformation(userId, data);
  }
  static async deleteBankInformation(userId: string, recordId: string) {
    const { BankInformationService } = require("@module/bank-information/BankInformationService");
    return BankInformationService.deleteBankInformation(userId, recordId);
  }
  static async resubmitBankVerification(userId: string) {
    const { BankInformationService } = require("@module/bank-information/BankInformationService");
    return BankInformationService.resubmitForVerification(userId);
  }
  static async updateBankInformation(userId: string, recordId: string, data: any) {
    const { BankInformationService } = require("@module/bank-information/BankInformationService");
    return BankInformationService.updateBankInformation(userId, recordId, data);
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
          const computed = t.type === BillingTransactionType.PAYMENT ? this.getPayerAndReceiverAmounts(baseAmt) : null;
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
      where: { user_id: { in: [transaction.from_id, transaction.to_id] }, has_gstin: true, gstin: { not: null } },
      select: { user_id: true, entity_type: true, has_gstin: true, gstin: true }
    });
    const findGst = (uid: number) => {
      const rows = taxInfos.filter((t: any) => t.user_id === uid && t.has_gstin && t.gstin);
      return (rows.find((t: any) => t.entity_type === 'AGENCY') || rows[0])?.gstin ?? null;
    };
    const senderGst = findGst(transaction.from_id);
    const receiverGst = findGst(transaction.to_id);

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

  /** Get invoice data for client-side PDF. Uses existing Invoice (created at payment time); fallback create for legacy.
   *  invoiceType selects a specific invoice: 'A' (service, mentor→client), 'B' (commission, ScaleDux→receiver),
   *  'C' (platform fee, ScaleDux→payer). When omitted, returns the payer/receiver invoice for the requesting user. */
  static async getInvoiceData(uniqueId: string, userId: number, invoiceType?: 'A' | 'B' | 'C') {
    const transaction = await (prisma as any).billingTransaction.findUnique({
      where: { unique_id: uniqueId },
      include: {
        currency: true,
        payer_invoice: true,
        receiver_invoice: true,
        invoice_a: true,
        booking: { select: { unique_id: true, title: true, scheduled_at: true, duration: true, amount: true } },
        milestone: {
          select: {
            id: true,
            title: true,
            amount: true,
            order_index: true,
            proposal: {
              select: {
                unique_id: true,
                proposed_amount: true,
                milestonesRows: { select: { id: true } },
                project: {
                  select: { unique_id: true, project_title: true, budget_amount: true, budget_currency: true }
                }
              }
            }
          }
        }
      }
    });
    if (!transaction) return { success: false as const, message: 'Transaction not found' };
    if (transaction.from_id !== userId && transaction.to_id !== userId) {
      return { success: false as const, message: 'Unauthorized' };
    }
    const isPayer = transaction.from_id === userId;
    // Invoice A (service) is shared by both parties; B (commission) is the receiver's, C (platform fee) is the payer's.
    if (invoiceType === 'B' && isPayer) return { success: false as const, message: 'Unauthorized' };
    if (invoiceType === 'C' && !isPayer) return { success: false as const, message: 'Unauthorized' };
    let invoice: any;
    let party: 'payer' | 'receiver';
    if (invoiceType === 'A') { invoice = transaction.invoice_a; party = 'receiver'; }
    else if (invoiceType === 'B') { invoice = transaction.receiver_invoice; party = 'receiver'; }
    else if (invoiceType === 'C') { invoice = transaction.payer_invoice; party = 'payer'; }
    else { party = isPayer ? 'payer' : 'receiver'; invoice = isPayer ? transaction.payer_invoice : transaction.receiver_invoice; }
    if (!invoice && !invoiceType && isPayer) {
      await this.createInvoicesForTransaction(transaction.id, { receiver: false });
      const refreshed = await (prisma as any).billingTransaction.findUnique({
        where: { id: transaction.id },
        include: { payer_invoice: true, receiver_invoice: true }
      });
      invoice = refreshed?.payer_invoice ?? null;
    }
    if (!invoice) return { success: false as const, message: 'Invoice not available yet' };
    const inv = invoice as any;
    const platformGstForResponse = inv.gst_number ?? inv.platform_gst ?? (appConfig.platformGstNumber ?? undefined);
    return {
      success: true as const,
      data: {
        uniqueId: transaction.unique_id,
        invoiceNumber: invoice.invoice_number,
        party,
        subjectType: transaction.subject_type,
        gstNumber: platformGstForResponse,
        platformGst: inv.platform_gst ?? undefined,
        senderGst: inv.sender_gst ?? undefined,
        receiverGst: inv.receiver_gst ?? undefined,
        fee: inv.fee != null ? parseFloat(inv.fee.toString()) : undefined,
        gstAmount: inv.gst_amount != null ? parseFloat(inv.gst_amount.toString()) : undefined,
        invoiceType: inv.invoice_type ?? null,
        platformFeeAmount: inv.platform_fee_amount != null ? parseFloat(inv.platform_fee_amount.toString()) : undefined,
        commissionAmount: inv.commission_amount != null ? parseFloat(inv.commission_amount.toString()) : undefined,
        processingFeeAmount: inv.processing_fee_amount != null ? parseFloat(inv.processing_fee_amount.toString()) : undefined,
        tcsAmount: inv.tcs_amount != null ? parseFloat(inv.tcs_amount.toString()) : undefined,
        isBillOfSupply: inv.is_bill_of_supply === true,
        senderName: invoice.sender_name,
        receiverName: invoice.receiver_name,
        amount: parseFloat(invoice.amount.toString()),
        currencyCode: invoice.currency_code,
        description: invoice.description,
        type: transaction.type,
        status: transaction.status,
        issuedAt: invoice.issued_at,
        meta: invoice.meta ?? undefined,
        contractRef: transaction.milestone ? {
          projectId: transaction.milestone.proposal?.project?.unique_id ?? null,
          projectTitle: transaction.milestone.proposal?.project?.project_title ?? null,
          projectBudget: transaction.milestone.proposal?.project?.budget_amount != null
            ? parseFloat(transaction.milestone.proposal.project.budget_amount.toString()) : null,
          projectCurrency: transaction.milestone.proposal?.project?.budget_currency ?? null,
          contractId: transaction.milestone.proposal?.unique_id ?? null,
          contractAmount: transaction.milestone.proposal?.proposed_amount != null
            ? parseFloat(transaction.milestone.proposal.proposed_amount.toString()) : null,
          milestoneTitle: transaction.milestone.title ?? null,
          milestoneAmount: transaction.milestone.amount != null
            ? parseFloat(transaction.milestone.amount.toString()) : null,
          milestoneIndex: transaction.milestone.order_index ?? null,
          totalMilestones: transaction.milestone.proposal?.milestonesRows?.length ?? null,
        } : (transaction.booking && invoice?.invoice_type === 'C') ? {
          // Only Invoice C (ScaleDux → user) shows "Amount Paid" = total the user paid (base + platform fee + GST).
          // Invoice A already shows the actual base the founder pays the mentor; B only covers ScaleDux's charge.
          amountPaid: transaction.payer_amount != null
            ? parseFloat(transaction.payer_amount.toString())
            : parseFloat(transaction.amount.toString()),
          bookingTitle: transaction.booking.title ?? '1:1 Video Call',
          bookingScheduledAt: transaction.booking.scheduled_at ?? null,
          bookingDuration: transaction.booking.duration ?? null,
        } : undefined
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
    const computed = tAny.type === BillingTransactionType.PAYMENT ? this.getPayerAndReceiverAmounts(baseAmount) : null;
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

  // ── New Invoice Creation Methods (C / A / B) ──

  /** Invoice C: ScaleDux → Client. Platform fee line item. Generated at milestone funding. */
  static async createInvoiceC(transactionId: number) {
    const tx = await (prisma as any).billingTransaction.findUnique({
      where: { id: transactionId },
      include: { currency: true, payer_invoice: true }
    });
    if (!tx || tx.payer_invoice) return;

    const users = await prisma.user.findMany({
      where: { id: { in: [tx.from_id, tx.to_id] } },
      select: { id: true, first_name: true, last_name: true }
    });
    const userName = (uid: number) => {
      const u = users.find(u => u.id === uid);
      return u ? [u.first_name, u.last_name].filter(Boolean).join(' ').trim() || '—' : '—';
    };

    const { invoiceNumber, financialYear, sequenceNumber } = await getNextInvoiceNumber('C');
    const platformFee = Number(tx.platform_fee_amount ?? 0);
    const platformFeeGst = Number(tx.platform_fee_gst ?? 0);

    const inv = await (prisma as any).invoice.create({
      data: {
        billing_transaction_id: transactionId,
        party: 'payer',
        invoice_type: 'C',
        sender_name: 'ScaleDux Software Innovations Pvt Ltd',
        receiver_name: userName(tx.from_id),
        amount: Number(tx.amount),
        currency_code: tx.currency?.code ?? 'INR',
        description: tx.description,
        invoice_number: invoiceNumber,
        gst_number: appConfig.platformGstNumber,
        platform_gst: appConfig.platformGstNumber,
        platform_fee_amount: platformFee,
        fee: platformFee,
        gst_amount: platformFeeGst,
        financial_year: financialYear,
        sequence_number: sequenceNumber,
        meta: tx.meta ?? undefined,
      }
    });

    await (prisma as any).billingTransaction.update({
      where: { id: transactionId },
      data: { payer_invoice_id: inv.id }
    });
  }

  /** Invoice A: Freelancer/Mentor → Client (generated by ScaleDux on behalf). Professional service. */
  static async createInvoiceA(transactionId: number) {
    const tx = await (prisma as any).billingTransaction.findUnique({
      where: { id: transactionId },
      include: { currency: true, invoice_a: true }
    });
    if (!tx || tx.invoice_a) return;

    const users = await prisma.user.findMany({
      where: { id: { in: [tx.from_id, tx.to_id] } },
      select: { id: true, first_name: true, last_name: true }
    });
    const userName = (uid: number) => {
      const u = users.find(u => u.id === uid);
      return u ? [u.first_name, u.last_name].filter(Boolean).join(' ').trim() || '—' : '—';
    };

    // Check if freelancer is GST registered
    const taxInfo = await (prisma as any).taxInformation.findFirst({
      where: { user_id: tx.to_id, has_gstin: true, gstin: { not: null } },
      select: { gstin: true }
    });
    const freelancerGst = taxInfo?.gstin ?? null;
    const isBillOfSupply = !freelancerGst;

    // Client GST
    const clientTax = await (prisma as any).taxInformation.findFirst({
      where: { user_id: tx.from_id, has_gstin: true, gstin: { not: null } },
      select: { gstin: true }
    });

    const { invoiceNumber, financialYear, sequenceNumber } = await getNextInvoiceNumber('A');

    const inv = await (prisma as any).invoice.create({
      data: {
        billing_transaction_id: transactionId,
        party: 'receiver',
        invoice_type: 'A',
        sender_name: userName(tx.to_id),
        receiver_name: userName(tx.from_id),
        amount: Number(tx.amount),
        currency_code: tx.currency?.code ?? 'INR',
        description: tx.description,
        invoice_number: invoiceNumber,
        gst_number: freelancerGst,
        sender_gst: freelancerGst,
        receiver_gst: clientTax?.gstin ?? null,
        is_bill_of_supply: isBillOfSupply,
        financial_year: financialYear,
        sequence_number: sequenceNumber,
        meta: tx.meta ?? undefined,
      }
    });

    await (prisma as any).billingTransaction.update({
      where: { id: transactionId },
      data: { invoice_a_id: inv.id }
    });
  }

  /** Invoice B: ScaleDux → Freelancer/Mentor. Commission/fees deduction. Generated at acknowledge/accept. */
  static async createInvoiceB(transactionId: number) {
    const tx = await (prisma as any).billingTransaction.findUnique({
      where: { id: transactionId },
      include: { currency: true, receiver_invoice: true }
    });
    if (!tx || tx.receiver_invoice) return;

    const users = await prisma.user.findMany({
      where: { id: { in: [tx.from_id, tx.to_id] } },
      select: { id: true, first_name: true, last_name: true }
    });
    const userName = (uid: number) => {
      const u = users.find(u => u.id === uid);
      return u ? [u.first_name, u.last_name].filter(Boolean).join(' ').trim() || '—' : '—';
    };

    const freelancerTax = await (prisma as any).taxInformation.findFirst({
      where: { user_id: tx.to_id, has_gstin: true, gstin: { not: null } },
      select: { gstin: true }
    });

    const { invoiceNumber, financialYear, sequenceNumber } = await getNextInvoiceNumber('B');
    const commission = Number(tx.commission_amount ?? 0);
    const commissionGst = Number(tx.commission_gst ?? 0);
    const processingFee = Number(tx.processing_fee_amount ?? 0);
    const processingFeeGst = Number(tx.processing_fee_gst ?? 0);
    const tcs = Number(tx.tcs_amount ?? 0);
    const totalDeduction = commission + commissionGst + processingFee + processingFeeGst + tcs;

    const inv = await (prisma as any).invoice.create({
      data: {
        billing_transaction_id: transactionId,
        party: 'receiver',
        invoice_type: 'B',
        sender_name: 'ScaleDux Software Innovations Pvt Ltd',
        receiver_name: userName(tx.to_id),
        amount: Number(tx.amount),
        currency_code: tx.currency?.code ?? 'INR',
        description: tx.description,
        invoice_number: invoiceNumber,
        gst_number: appConfig.platformGstNumber,
        platform_gst: appConfig.platformGstNumber,
        receiver_gst: freelancerTax?.gstin ?? null,
        commission_amount: commission,
        processing_fee_amount: processingFee,
        tcs_amount: tcs,
        fee: totalDeduction,
        gst_amount: commissionGst + processingFeeGst,
        financial_year: financialYear,
        sequence_number: sequenceNumber,
        meta: tx.meta ?? undefined,
      }
    });

    await (prisma as any).billingTransaction.update({
      where: { id: transactionId },
      data: { receiver_invoice_id: inv.id }
    });
  }
}

