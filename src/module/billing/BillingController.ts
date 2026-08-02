import { Request, Response } from "express";
import { BillingService } from "./BillingService";
import { ApiResponse } from "@utils/ApiResponse";
import { getStringParam } from "@utils/requestHelpers";
import { ConversationService } from "@module/chat/ConversationService";
import { createProposalActivity } from "@module/proposal/ProposalActivityService";
import { CHAT_SYSTEM_MESSAGES } from "../../constants/chatSystemMessages";
import { BillingTransactionStatus, ProposalStatus, MilestonePaymentStatus, ProjectStatus } from "@constants/status";
import { prisma } from "@services/prismaService";
import { Log } from "@services/loggerService";
import { dispatch } from "@queues/Queue";
import { NotificationJob } from "../../jobs/NotificationJob";
import { NotificationEmailJob } from "../../jobs/NotificationEmailJob";
import { appConfig } from "@config/app";

export class BillingController {
  // Get payment breakdown (platform fee only on first milestone, gst, service fee) for display and Razorpay total
  static async getPaymentBreakdown(req: Request, res: Response) {
    const amountParam = req.query.amount ?? req.body?.amount;
    const firstMilestoneParam = req.query.firstMilestone;
    const milestoneAmount = amountParam != null ? Number(amountParam) : undefined;
    const isFirstMilestone = firstMilestoneParam === undefined || firstMilestoneParam === 'true' || firstMilestoneParam === '';
    const data = BillingService.getPaymentBreakdown(
      Number.isFinite(milestoneAmount) ? milestoneAmount : undefined,
      isFirstMilestone
    );
    return ApiResponse.success(res, data);
  }

  // Create Razorpay order. For payment: send milestoneId (and optional milestoneIndex); amount is computed on server. For card verification: no body or { amount: 1 }.
  static async createVerificationOrder(req: Request, res: Response) {
    const userId = req.user?.id;
    if (!userId) {
      return ApiResponse.error(res, "User not authenticated", 401);
    }

    const { milestoneId, milestoneIndex } = req.body;
    const milestoneIdNum = milestoneId != null ? parseInt(String(milestoneId), 10) : NaN;

    if (Number.isFinite(milestoneIdNum) && milestoneIdNum > 0) {
      const orderAmounts = await BillingService.getMilestoneOrderAmount(
        userId,
        milestoneIdNum,
        milestoneIndex != null ? parseInt(String(milestoneIndex), 10) : undefined
      );
      if (!orderAmounts.success || orderAmounts.totalFounderPays == null) {
        return ApiResponse.error(res, orderAmounts.message ?? "Invalid milestone", 400);
      }
      const result = await BillingService.createVerificationOrder(userId.toString(), orderAmounts.totalFounderPays, {
        receiptPrefix: "pay",
        notes: { purpose: "milestone_payment", milestone_id: String(milestoneIdNum), user_id: userId.toString() },
        freelancerTransfer: orderAmounts.freelancerTransfer
      });
      if (!result.success) return ApiResponse.error(res, result.message);
      return ApiResponse.success(res, result.data, "Order created successfully");
    }

    const { amount } = req.body;
    const amountNum = amount != null ? Number(amount) : 1;
    if (amountNum !== 1) {
      return ApiResponse.error(res, "For card verification only amount 1 is allowed. For payment send milestoneId.", 400);
    }
    const result = await BillingService.createVerificationOrder(userId.toString(), 1);
    if (!result.success) return ApiResponse.error(res, result.message);
    return ApiResponse.success(res, result.data, "Order created successfully");
  }

  // Verify Razorpay payment and save payment method (or record subject-based payment when subjectType + subjectId sent)
  static async verifyPaymentSignature(req: Request, res: Response) {
    const userId = req.user?.id;
    if (!userId) {
      return ApiResponse.error(res, "User not authenticated", 401);
    }

    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, milestoneId, milestoneIndex: milestoneIndexBody, subjectType, subjectId } = req.body;

    // Verify Razorpay signature
    const isValid = BillingService.verifyPaymentSignature({
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature
    });

    if (!isValid) {
      return ApiResponse.error(res, "Invalid payment signature", 400);
    }

    // Proposal payment: pass milestoneId and milestoneIndex from frontend (same index used for breakdown)
    const mid = milestoneId != null ? parseInt(milestoneId, 10) : NaN;
    const milestoneIndexParam = milestoneIndexBody != null ? parseInt(milestoneIndexBody, 10) : undefined;
    if (Number.isFinite(mid) && mid > 0) {
      const handled = await BillingController.handleMilestonePayment(res, userId, mid, razorpayPaymentId, razorpayOrderId, Number.isFinite(milestoneIndexParam) ? milestoneIndexParam : undefined);
      if (handled) return;
    }
    const subjType = (subjectType ?? null) as string | null;
    if (subjType && subjectId != null) {
      const handled = await BillingController.handlePaymentBySubjectType(res, userId, subjType, subjectId);
      if (handled) return;
    }

    return ApiResponse.error(res, "Invalid or unsupported payment. Provide milestoneId or subjectType and subjectId.", 400);
  }

  /**
   * Handle milestone payment: pay one milestone by id; set HIRED on first milestone pay.
   * Second milestone Pay is only allowed after first is completed.
   * milestoneIndexFromFrontend: optional index from frontend (same as used for breakdown); if provided and valid, used instead of computing.
   */
  private static async handleMilestonePayment(
    res: Response,
    userId: number,
    milestoneId: number,
    razorpayPaymentId?: string,
    razorpayOrderId?: string,
    milestoneIndexFromFrontend?: number
  ): Promise<boolean> {
    const milestoneRow = await (prisma as any).milestone.findUnique({
      where: { id: milestoneId },
      include: {
        proposal: {
          include: {
            project: { select: { id: true, user_id: true, project_title: true } },
            milestonesRows: { orderBy: { order_index: "asc" } }
          }
        }
      }
    });
    if (!milestoneRow?.proposal) {
      ApiResponse.error(res, "Milestone not found", 404);
      return true;
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
      ApiResponse.error(res, "Milestone not found for this proposal", 400);
      return true;
    }
    if (proposal.project.user_id !== userId) {
      ApiResponse.error(res, "You are not the project owner for this proposal", 403);
      return true;
    }
    if (proposal.status === ProposalStatus.TERMINATING) {
      ApiResponse.error(res, "Cannot fund a contract that is scheduled to terminate. Restore the contract first if you want to continue.", 400);
      return true;
    }
    if (proposal.status !== ProposalStatus.OFFER_ACCEPTED && proposal.status !== ProposalStatus.HIRED) {
      ApiResponse.error(res, "Payment is only available after the freelancer has signed the NDA (OFFER_ACCEPTED) or already hired (HIRED).", 400);
      return true;
    }
    if (milestoneIndex === 0) {
      const existingHiredOrTerminating = await (prisma as any).proposal.findFirst({
        where: {
          project_id: proposal.project.id,
          id: { not: proposal.id },
          status: { in: [ProposalStatus.HIRED, ProposalStatus.TERMINATING] }
        }
      });
      if (existingHiredOrTerminating) {
        ApiResponse.error(res, "This project already has an active or terminating contract. You cannot hire until that contract is terminated or restored.", 400);
        return true;
      }
    }
    const amount = Number(milestoneRow?.amount ?? 0) || 0;
    if (amount <= 0) {
      ApiResponse.error(res, "Invalid milestone amount", 400);
      return true;
    }

    if (!razorpayPaymentId) {
      ApiResponse.error(res, "razorpayPaymentId is required", 400);
      return true;
    }
    // Recomputed the same way the order amount was, so a captured payment for a different
    // milestone or a tampered amount cannot be recorded against this one.
    const expected = await BillingService.getMilestoneOrderAmount(userId, milestoneId, milestoneIndex);
    if (!expected.success) {
      Log.warn("Could not recompute milestone order amount at verify time", {
        milestoneId, reason: expected.message
      });
    }
    const captureCheck = await BillingService.verifyCapturedPayment({
      razorpayPaymentId,
      razorpayOrderId,
      expectedAmountInr: expected.success ? expected.totalFounderPays : undefined
    });
    if (!captureCheck.success) {
      ApiResponse.error(res, captureCheck.message ?? "Payment verification failed", 400);
      return true;
    }
    if (await BillingService.isPaymentAlreadyRecorded(razorpayPaymentId)) {
      ApiResponse.error(res, "This payment has already been recorded", 409);
      return true;
    }

    const projectTitle = proposal.project.project_title || "project";
    const milestoneTitle = milestoneRow?.title || milestoneRow?.description || `Milestone ${milestoneIndex + 1}`;
    const meta: Record<string, string> = { milestone_index: String(milestoneIndex) };
    if (razorpayPaymentId) {
      const razorpayMeta = await BillingService.fetchRazorpayPaymentMeta(razorpayPaymentId, razorpayOrderId);
      Object.assign(meta, razorpayMeta);
    } else if (razorpayOrderId) {
      meta.razorpay_order_id = razorpayOrderId;
    }
    const payResult = await BillingService.recordPayment({
      actorId: proposal.project.user_id,
      fromId: proposal.project.user_id,
      toId: proposal.provider_id,
      subjectType: "Proposal",
      subjectId: proposal.id,
      amount,
      description: `Payment for ${projectTitle}: ${milestoneTitle}`,
      meta,
      status: BillingTransactionStatus.PENDING,
      milestoneId: milestoneRow.id
    });
    const transactionUniqueId = (payResult as any)?.data?.transactionUniqueId ?? undefined;

    const messageContent = "Funded milestone";
    const metadata: Record<string, unknown> = {
      activityType: "payment_release",
      activityId: proposal.unique_id,
      projectTitle,
      milestoneIndex,
      messageSent: CHAT_SYSTEM_MESSAGES.PAYMENT_RELEASE_SENT,
      messageReceived: CHAT_SYSTEM_MESSAGES.PAYMENT_RELEASE_RECEIVED
    };
    await ConversationService.syncSystemMessage(
      proposal.project.user_id,
      proposal.provider_id,
      messageContent,
      metadata,
      proposal.project.id,
      proposal.project.user_id
    );

    if (milestoneIndex === 0) {
      const hireDate = new Date();
      const statusBeforeHire = proposal.status;

      await (prisma as any).proposal.update({
        where: { id: proposal.id },
        data: { status: ProposalStatus.HIRED, milestones_approved: true }
      });
      // Paying is what starts the work, so this is where the project leaves the
      // market. Scoped so a DRAFT or COMPLETED project stays put.
      await (prisma as any).founderProject.updateMany({
        where: { id: proposal.project.id, status: ProjectStatus.PUBLISHED },
        data: { status: ProjectStatus.IN_PROGRESS }
      });
      if (statusBeforeHire !== ProposalStatus.HIRED) {
        await createProposalActivity(proposal.unique_id, 'STATUS_CHANGE', {
          oldStatus: statusBeforeHire,
          newStatus: ProposalStatus.HIRED
        }, userId);
      }
      await (prisma as any).milestone.updateMany({
        where: { proposal_id: proposal.id },
        data: { is_approved: true }
      });

      for (const row of rows) {
        if (row.due_date) {
          const created = new Date(row.created_at);
          const original = new Date(row.due_date);
          const daysOffset = Math.round((original.getTime() - created.getTime()) / 86_400_000);
          const newDue = new Date(hireDate);
          newDue.setDate(newDue.getDate() + Math.max(0, daysOffset));
          await (prisma as any).milestone.update({
            where: { id: row.id },
            data: { due_date: newDue }
          });
        }
      }
    }

    await (prisma as any).milestone.update({
      where: { id: milestoneRow.id },
      data: { payment_status: MilestonePaymentStatus.FUNDED }
    });

    await createProposalActivity(proposal.unique_id, 'MILESTONE_PAYMENT', {
      milestoneIndex,
      amount,
      milestoneTitle,
      transactionId: transactionUniqueId
    }, userId);

    // Notify the provider: milestone 0 funding is the hire/first payment; others are escrow funding.
    const proposalLink = `${appConfig.frontendUrl}/proposals-and-offers/${proposal.unique_id}`;
    const fundNotif = milestoneIndex === 0
      ? {
          userId: proposal.provider_id,
          type: 'HIRED' as const,
          notificationTitle: 'You have been hired',
          notificationBody: `You were hired for "${projectTitle}". The first milestone is funded. You can start working.`,
          notificationLink: proposalLink,
          actorId: proposal.project.user_id,
          subjectType: 'Proposal' as const,
          subjectId: proposal.id
        }
      : {
          userId: proposal.provider_id,
          type: 'MILESTONE_FUNDED' as const,
          notificationTitle: 'Milestone funded',
          notificationBody: `"${milestoneTitle}" on "${projectTitle}" has been funded into escrow.`,
          notificationLink: proposalLink,
          actorId: proposal.project.user_id,
          subjectType: 'Proposal' as const,
          subjectId: proposal.id
        };
    await dispatch(NotificationJob, fundNotif);
    await dispatch(NotificationEmailJob, fundNotif);

    ApiResponse.success(res, { proposalPayment: true, milestoneIndex }, "Milestone payment recorded");
    return true;
  }

  /**
   * Handle payment for other subject types (extend here for future types).
   * Returns true if handled, false if not supported.
   */
  private static async handlePaymentBySubjectType(
    res: Response,
    _userId: number,
    subjectType: string,
    _subjectId: unknown
  ): Promise<boolean> {
    if (subjectType !== "Proposal") {
      // Future: case "Subscription", "ServicePackage", etc.
      return false;
    }
    return false;
  }

  // Get user's payment methods
  static async getPaymentMethods(req: Request, res: Response) {
    const userId = req.user?.id;
    if (!userId) {
      return ApiResponse.error(res, "User not authenticated", 401);
    }

    const result = await BillingService.getPaymentMethods(userId.toString());
    return ApiResponse.success(res, result.data);
  }

  // Set payment method as default
  static async setDefaultPaymentMethod(req: Request, res: Response) {
    const userId = req.user?.id;
    const paymentMethodId = getStringParam(req.params.paymentMethodId);

    if (!userId) {
      return ApiResponse.error(res, "User not authenticated", 401);
    }

    const result = await BillingService.setDefaultPaymentMethod(userId.toString(), paymentMethodId);

    if (!result.success) {
      return ApiResponse.error(res, result.message);
    }

    return ApiResponse.success(res, null, result.message);
  }

  // Delete payment method
  static async deletePaymentMethod(req: Request, res: Response) {
    const userId = req.user?.id;
    const paymentMethodId = getStringParam(req.params.paymentMethodId);

    if (!userId) {
      return ApiResponse.error(res, "User not authenticated", 401);
    }

    const result = await BillingService.deletePaymentMethod(userId.toString(), paymentMethodId);

    if (!result.success) {
      return ApiResponse.error(res, result.message, (result as any).requiresDefaultReassignment ? 400 : 404);
    }

    return ApiResponse.success(res, null, result.message);
  }

  // Get billing history/transactions
  static async getBillingHistory(req: Request, res: Response) {
    const userId = req.user?.id;
    if (!userId) {
      return ApiResponse.error(res, "User not authenticated", 401);
    }

    const defaultBillingLimit = Number(process.env.BILLING_PAGE_LIMIT) || 10;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || defaultBillingLimit;
    const fromDate = req.query.fromDate as string | undefined;
    const toDate = req.query.toDate as string | undefined;
    const search = req.query.search as string | undefined;
    const creditsOnly = req.query.creditsOnly === 'true' || req.query.creditsOnly === '1';

    const result = await BillingService.getBillingHistory(
      userId.toString(),
      page,
      limit,
      fromDate,
      toDate,
      search,
      creditsOnly
    );
    return ApiResponse.success(res, result.data);
  }

  // Get user's balance
  static async getUserBalance(req: Request, res: Response) {
    const userId = req.user?.id;
    if (!userId) {
      return ApiResponse.error(res, "User not authenticated", 401);
    }

    const result = await BillingService.getUserBalance(userId.toString());
    return ApiResponse.success(res, result.data);
  }

  // Release a pending payment (payer only). Sets transaction to completed and updates user totals.
  static async releasePayment(req: Request, res: Response) {
    const userId = req.user?.id;
    if (!userId) return ApiResponse.error(res, "User not authenticated", 401);
    const uniqueId = getStringParam(req.params.uniqueId);
    if (!uniqueId) return ApiResponse.error(res, "Transaction ID is required", 400);
    const result = await BillingService.releasePaymentTransaction(uniqueId, userId);
    if (!result.success) {
      const code = result.message?.includes("not found") ? 404 : result.message?.includes("Only the") ? 403 : 400;
      return ApiResponse.error(res, result.message ?? "Failed to release payment", code);
    }
    return ApiResponse.success(res, null, "Payment released successfully");
  }

  // Get transaction detail (for modal); if Proposal, includes milestone payments
  static async getTransactionDetail(req: Request, res: Response) {
    const userId = req.user?.id;
    if (!userId) {
      return ApiResponse.error(res, "User not authenticated", 401);
    }
    const { uniqueId } = req.params;
    if (!uniqueId || Array.isArray(uniqueId)) {
      return ApiResponse.error(res, "Transaction ID is required", 400);
    }
    const result = await BillingService.getTransactionDetail(uniqueId, userId.toString());
    if (!result.success) {
      return ApiResponse.error(res, result.message, 404);
    }
    return ApiResponse.success(res, result.data);
  }

  private static async ensureFreelancer(req: Request): Promise<boolean> {
    const user = req.user as any;
    if (!user) return false;
    const role = (user.role || "").toLowerCase();
    const profileType = (user.profile_type || "").toLowerCase();
    if (role === "freelancer" || role === "service-provider" || profileType === "freelancer") return true;
    const userId = user.id;
    if (!userId) return false;
    const dbUser = await prisma.user.findUnique({ where: { id: Number(userId) }, select: { role: true } });
    if (!dbUser) return false;
    const dbRole = (dbUser.role || "").toLowerCase();
    const ok = dbRole === "freelancer" || dbRole === "service-provider";
    if (ok && req.user) (req.user as any).role = dbUser.role;
    return ok;
  }

  /** Request payout for a specific payment to bank. POST /transaction/:uniqueId/request-payout (also /request-withdraw for compat). */
  static async requestPayout(req: Request, res: Response) {
    const userId = req.user?.id;
    if (!userId) return ApiResponse.error(res, "User not authenticated", 401);
    if (!(await BillingController.ensureFreelancer(req))) return ApiResponse.error(res, "Only freelancers can request payout", 403);
    const uniqueId = getStringParam(req.params.uniqueId);
    if (!uniqueId) return ApiResponse.error(res, "Transaction ID is required", 400);
    const bankInformationId = req.body?.bankInformationId ?? req.body?.withdrawalMethodId;
    const bankInfoIdNum = bankInformationId != null ? parseInt(String(bankInformationId), 10) : undefined;
    if (bankInfoIdNum == null || !Number.isFinite(bankInfoIdNum)) {
      return ApiResponse.error(res, "Bank information is required", 400);
    }
    const result = await BillingService.setReceiverWithdrawInProcess(uniqueId, userId, bankInfoIdNum);
    if (!result.success) {
      const code = result.message?.includes("not found") ? 404 : result.message?.includes("Only the") ? 403 : 400;
      return ApiResponse.error(res, result.message ?? "Failed to request payout", code);
    }
    return ApiResponse.success(res, null, "Payout requested");
  }

  /** Webhook: set receiver_status to released and create receiver invoice. */
  static async webhookReceiverReleased(req: Request, res: Response) {
    const uniqueId = getStringParam(req.params.uniqueId);
    if (!uniqueId) return ApiResponse.error(res, "Transaction ID is required", 400);
    const result = await BillingService.setReceiverReleased(uniqueId);
    if (!result.success) {
      return ApiResponse.error(res, result.message ?? "Failed to set released", 400);
    }
    return ApiResponse.success(res, null, "Receiver released");
  }

  /** Return invoice data as JSON for client-side PDF generation (realtime). */
  static async getInvoiceData(req: Request, res: Response) {
    const { uniqueId } = req.params;
    if (!uniqueId || Array.isArray(uniqueId)) {
      return ApiResponse.error(res, "Transaction ID is required", 400);
    }
    const userId = req.user?.id;
    if (!userId) return ApiResponse.unauthorized(res, "Authentication required");
    const invoiceParam = String(req.query.invoice ?? '').toUpperCase();
    const invoiceType = (['A', 'B', 'C'].includes(invoiceParam) ? invoiceParam : undefined) as 'A' | 'B' | 'C' | undefined;
    const result = await BillingService.getInvoiceData(uniqueId as string, userId, invoiceType);
    if (!result.success) {
      return ApiResponse.error(res, result.message, 404);
    }
    return ApiResponse.success(res, result.data, "OK");
  }

  /** Freelancer sends auto-generated invoice for a completed milestone. */
  static async sendFreelancerInvoice(req: Request, res: Response) {
    const userId = req.user?.id;
    if (!userId) return ApiResponse.error(res, "User not authenticated", 401);
    const milestoneId = parseInt(req.params.milestoneId, 10);
    if (!Number.isFinite(milestoneId)) return ApiResponse.error(res, "milestoneId is required", 400);
    const result = await BillingService.sendFreelancerInvoice(userId, milestoneId);
    if (!result.success) return ApiResponse.error(res, result.message, 400);
    return ApiResponse.success(res, null, result.message);
  }

  /** Founder acknowledges milestone: triggers Razorpay transfer, generates Invoice B. */
  static async acknowledgeMilestone(req: Request, res: Response) {
    const userId = req.user?.id;
    if (!userId) return ApiResponse.error(res, "User not authenticated", 401);
    const { transactionUniqueId } = req.body;
    if (!transactionUniqueId) return ApiResponse.error(res, "transactionUniqueId is required", 400);
    const result = await BillingService.acknowledgeMilestonePayment(transactionUniqueId, userId);
    if (!result.success) return ApiResponse.error(res, result.message, 400);
    return ApiResponse.success(res, null, "Payment acknowledged");
  }

  /** Razorpay webhook handler: verifies signature, processes transfer.settled events. */
  static async razorpayWebhook(req: Request, res: Response) {
    const { appConfig } = await import('@config/app');
    const crypto = await import('crypto');
    const secret = appConfig.razorpayWebhookSecret;
    if (!secret) {
      return res.status(500).json({ error: 'Webhook secret not configured' });
    }

    const signature = req.headers['x-razorpay-signature'] as string;
    const body = JSON.stringify(req.body);
    const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');
    if (expected !== signature) {
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const event = req.body?.event;
    const payload = req.body?.payload;

    if (event === 'transfer.processed') {
      const transferId = payload?.transfer?.entity?.id;
      if (transferId) {
        await BillingService.handleTransferSettled(transferId);
      }
    }

    // Always return 200 to Razorpay
    return res.status(200).json({ status: 'ok' });
  }
}
