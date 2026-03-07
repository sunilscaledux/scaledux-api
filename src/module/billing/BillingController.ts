import { Request, Response } from "express";
import { BillingService } from "./BillingService";
import { ApiResponse } from "@utils/ApiResponse";
import { getStringParam } from "@utils/requestHelpers";
import { ConversationService } from "@module/chat/ConversationService";
import { createProposalActivity } from "@module/proposal/ProposalActivityService";
import { CHAT_SYSTEM_MESSAGES } from "../../constants/chatSystemMessages";
import { prisma } from "@services/prismaService";

export class BillingController {
  // Create Razorpay order for card verification
  static async createVerificationOrder(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      console.log('👤 User ID:', userId);
      if (!userId) {
        return ApiResponse.error(res, "User not authenticated", 401);
      }

      const { amount } = req.body;
      const result = await BillingService.createVerificationOrder(userId.toString(), amount || 1);
      
      if (!result.success) {
        return ApiResponse.error(res, result.message);
      }

      return ApiResponse.success(res, result.data, "Verification order created successfully");
    } catch (error: any) {
      console.error("Error creating verification order:", error);
      return ApiResponse.error(res, error.message || "Failed to create verification order");
    }
  }

  // Verify Razorpay payment and save payment method (or record subject-based payment when subjectType + subjectId sent)
  static async verifyAndSavePaymentMethod(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return ApiResponse.error(res, "User not authenticated", 401);
      }

      const { razorpayOrderId, razorpayPaymentId, razorpaySignature, proposalId, subjectType, subjectId, milestoneIndex } = req.body;

      // Verify Razorpay signature
      const isValid = BillingService.verifyPaymentSignature({
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature
      });

      if (!isValid) {
        return ApiResponse.error(res, "Invalid payment signature", 400);
      }

      // Milestone payment: proposalId + milestoneIndex (0-based)
      const mi = milestoneIndex != null ? parseInt(milestoneIndex, 10) : NaN;
      if (typeof proposalId === "string" && proposalId.trim() && Number.isFinite(mi) && mi >= 0) {
        const handled = await BillingController.handleMilestonePayment(res, userId, proposalId.trim(), mi, razorpayPaymentId, razorpayOrderId);
        if (handled) return;
      }

      // Subject-based payment: route by subject type (Proposal, etc.)
      const subjType = (subjectType ?? (proposalId ? "Proposal" : null)) as string | null;
      if (subjType === "Proposal" && typeof proposalId === "string" && proposalId.trim()) {
        const handled = await BillingController.handleProposalPayment(res, userId, proposalId.trim(), razorpayPaymentId, razorpayOrderId);
        if (handled) return;
      }
      if (subjType && subjectId != null) {
        const handled = await BillingController.handlePaymentBySubjectType(res, userId, subjType, subjectId);
        if (handled) return;
      }

      // Card verification flow: fetch card details and save payment method
      const cardDetails = await BillingService.fetchPaymentDetails(razorpayPaymentId);

      if (!cardDetails) {
        return ApiResponse.error(res, "Failed to fetch card details from Razorpay", 500);
      }

      let customerId = cardDetails.customerId;
      if (!customerId && cardDetails.email && cardDetails.contact) {
        customerId = await BillingService.createOrGetCustomer(
          userId.toString(),
          cardDetails.email,
          cardDetails.contact,
          cardDetails.cardHolderName
        );
      }

      const paymentMethodData = {
        paymentType: 'card' as const,
        razorpayCustomerId: customerId || '',
        razorpayPaymentId: razorpayPaymentId,
        cardToken: cardDetails.cardToken,
        cardBrand: cardDetails.cardBrand,
        lastFourDigits: cardDetails.lastFourDigits,
        cardHolderName: cardDetails.cardHolderName,
        expiryMonth: cardDetails.expiryMonth,
        expiryYear: cardDetails.expiryYear,
        verificationAmount: 1,
        isDefault: false
      };

      const result = await BillingService.savePaymentMethod(userId.toString(), paymentMethodData);
      return ApiResponse.success(res, result.data, result.message);
    } catch (error: any) {
      console.error("Error verifying and saving payment method:", error);
      return ApiResponse.error(res, error.message || "Failed to verify and save payment method");
    }
  }

  /**
   * Handle payment for subject type "Proposal": load proposal, validate, record one billing row, sync chat.
   * Returns true if handled (response sent), false otherwise.
   */
  private static async handleProposalPayment(res: Response, userId: number, proposalId: string, razorpayPaymentId?: string, razorpayOrderId?: string): Promise<boolean> {
    const proposal = await (prisma as any).proposal.findFirst({
      where: { unique_id: proposalId },
      include: {
        project: { select: { id: true, user_id: true, project_title: true } }
      }
    });
    if (!proposal) {
      ApiResponse.error(res, "Proposal not found", 404);
      return true;
    }
    if (proposal.project.user_id !== userId) {
      ApiResponse.error(res, "You are not the project owner for this proposal", 403);
      return true;
    }
    if (proposal.status !== 'OFFER_ACCEPTED') {
      ApiResponse.error(res, "Payment is only available after the freelancer has signed the NDA (proposal must be OFFER_ACCEPTED)", 400);
      return true;
    }
    const existingHiredOrTerminating = await (prisma as any).proposal.findFirst({
      where: {
        project_id: proposal.project.id,
        id: { not: proposal.id },
        status: { in: ['HIRED', 'TERMINATING'] }
      }
    });
    if (existingHiredOrTerminating) {
      ApiResponse.error(res, "This project already has an active or terminating contract. You cannot hire until that contract is terminated or restored.", 400);
      return true;
    }

    const amount = Number(proposal.proposed_amount) || 0;
    if (amount <= 0) {
      ApiResponse.error(res, "Invalid proposal amount", 400);
      return true;
    }

    const projectTitle = proposal.project.project_title || "project";
    const meta: Record<string, string> = razorpayPaymentId
      ? await BillingService.fetchRazorpayPaymentMeta(razorpayPaymentId, razorpayOrderId)
      : {};
    const payResult = await BillingService.recordPayment({
      actorId: proposal.project.user_id,
      fromId: proposal.project.user_id,
      toId: proposal.provider_id,
      subjectType: "Proposal",
      subjectId: proposal.id,
      amount,
      description: `Payment for ${projectTitle}`,
      meta: Object.keys(meta).length ? meta : undefined,
      status: 'pending'
    });
    const transactionUniqueId = (payResult as any)?.data?.transactionUniqueId ?? undefined;

    const messageContent = "Funded milestone";
    const metadata: Record<string, unknown> = {
      activityType: "payment_release",
      activityId: proposal.unique_id,
      projectTitle,
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

    // Mark proposal as HIRED after successful payment
    await (prisma as any).proposal.update({
      where: { id: proposal.id },
      data: { status: 'HIRED' }
    });

    await createProposalActivity(proposal.unique_id, 'HIRE_PAYMENT', { amount, transactionId: transactionUniqueId }, userId);

    ApiResponse.success(res, { proposalPayment: true }, "Payment recorded and synced to chat");
    return true;
  }

  /**
   * Handle milestone payment: pay one milestone; set HIRED on first milestone pay.
   * Second milestone Pay is only allowed after first is completed.
   */
  private static async handleMilestonePayment(
    res: Response,
    userId: number,
    proposalId: string,
    milestoneIndex: number,
    razorpayPaymentId?: string,
    razorpayOrderId?: string
  ): Promise<boolean> {
    const proposal = await (prisma as any).proposal.findFirst({
      where: { unique_id: proposalId },
      include: {
        project: { select: { id: true, user_id: true, project_title: true } },
        milestonesRows: { orderBy: { order_index: "asc" } }
      }
    });
    if (!proposal) {
      ApiResponse.error(res, "Proposal not found", 404);
      return true;
    }
    if (proposal.project.user_id !== userId) {
      ApiResponse.error(res, "You are not the project owner for this proposal", 403);
      return true;
    }
    if (proposal.status === "TERMINATING") {
      ApiResponse.error(res, "Cannot fund a contract that is scheduled to terminate. Restore the contract first if you want to continue.", 400);
      return true;
    }
    if (proposal.status !== "OFFER_ACCEPTED" && proposal.status !== "HIRED") {
      ApiResponse.error(res, "Payment is only available after the freelancer has signed the NDA (OFFER_ACCEPTED) or already hired (HIRED).", 400);
      return true;
    }
    if (milestoneIndex === 0) {
      const existingHiredOrTerminating = await (prisma as any).proposal.findFirst({
        where: {
          project_id: proposal.project.id,
          id: { not: proposal.id },
          status: { in: ['HIRED', 'TERMINATING'] }
        }
      });
      if (existingHiredOrTerminating) {
        ApiResponse.error(res, "This project already has an active or terminating contract. You cannot hire until that contract is terminated or restored.", 400);
        return true;
      }
    }
    const rows = proposal.milestonesRows ?? [];
    if (milestoneIndex < 0 || milestoneIndex >= rows.length) {
      ApiResponse.error(res, "Invalid milestone index", 400);
      return true;
    }
    const milestoneRow = rows[milestoneIndex];
    const amount = Number(milestoneRow?.amount ?? 0) || 0;
    if (amount <= 0) {
      ApiResponse.error(res, "Invalid milestone amount", 400);
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
      status: 'pending',
      milestoneId: milestoneRow?.id ?? null
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

      await (prisma as any).proposal.update({
        where: { id: proposal.id },
        data: { status: "HIRED", milestones_approved: true }
      });
      await (prisma as any).milestone.updateMany({
        where: { proposal_id: proposal.id },
        data: { is_approved: true }
      });

      // Auto-adjust each milestone's due_date: preserve the original offset
      // (due_date - created_at) and apply it from the hire date.
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

    // Update milestone payment_status to FUNDED (money in escrow; RELEASED when founder releases after work approved)
    if (milestoneRow?.id) {
      await (prisma as any).milestone.update({
        where: { id: milestoneRow.id },
        data: { payment_status: "FUNDED" }
      });
    }

    await createProposalActivity(proposal.unique_id, 'MILESTONE_PAYMENT', {
      milestoneIndex,
      amount,
      milestoneTitle,
      transactionId: transactionUniqueId
    }, userId);

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
    try {
      const userId = req.user?.id;
      if (!userId) {
        return ApiResponse.error(res, "User not authenticated", 401);
      }

      const result = await BillingService.getPaymentMethods(userId.toString());
      return ApiResponse.success(res, result.data);
    } catch (error: any) {
      console.error("Error fetching payment methods:", error);
      return ApiResponse.error(res, error.message || "Failed to fetch payment methods");
    }
  }

  // Set payment method as default
  static async setDefaultPaymentMethod(req: Request, res: Response) {
    try {
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
    } catch (error: any) {
      console.error("Error setting default payment method:", error);
      return ApiResponse.error(res, error.message || "Failed to set default payment method");
    }
  }

  // Delete payment method
  static async deletePaymentMethod(req: Request, res: Response) {
    try {
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
    } catch (error: any) {
      console.error("Error deleting payment method:", error);
      return ApiResponse.error(res, error.message || "Failed to delete payment method");
    }
  }

  // Save tax information
  static async saveTaxInformation(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return ApiResponse.error(res, "User not authenticated", 401);
      }

      const result = await BillingService.saveTaxInformation(userId.toString(), req.body);
      return ApiResponse.success(res, result.data, result.message);
    } catch (error: any) {
      console.error("Error saving tax information:", error);
      return ApiResponse.error(res, error.message || "Failed to save tax information");
    }
  }

  // Get user's tax information
  static async getTaxInformation(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return ApiResponse.error(res, "User not authenticated", 401);
      }

      const result = await BillingService.getTaxInformation(userId.toString());
      return ApiResponse.success(res, result.data);
    } catch (error: any) {
      console.error("Error fetching tax information:", error);
      return ApiResponse.error(res, error.message || "Failed to fetch tax information");
    }
  }

  // Get billing history/transactions
  static async getBillingHistory(req: Request, res: Response) {
    try {
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

      const result = await BillingService.getBillingHistory(
        userId.toString(), 
        page, 
        limit,
        fromDate,
        toDate,
        search
      );
      return ApiResponse.success(res, result.data);
    } catch (error: any) {
      console.error("Error fetching billing history:", error);
      return ApiResponse.error(res, error.message || "Failed to fetch billing history");
    }
  }

  // Get user's balance
  static async getUserBalance(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return ApiResponse.error(res, "User not authenticated", 401);
      }

      const result = await BillingService.getUserBalance(userId.toString());
      return ApiResponse.success(res, result.data);
    } catch (error: any) {
      console.error("Error fetching user balance:", error);
      return ApiResponse.error(res, error.message || "Failed to fetch user balance");
    }
  }

  // Release a pending payment (payer only). Sets transaction to completed and updates user totals.
  static async releasePayment(req: Request, res: Response) {
    try {
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
    } catch (error: any) {
      console.error("Error releasing payment:", error);
      return ApiResponse.error(res, error.message || "Failed to release payment");
    }
  }

  // Get transaction detail (for modal); if Proposal, includes milestone payments
  static async getTransactionDetail(req: Request, res: Response) {
    try {
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
    } catch (error: any) {
      console.error("Error fetching transaction detail:", error);
      return ApiResponse.error(res, error.message || "Failed to fetch transaction detail");
    }
  }

  // ----- Withdrawal (freelancer only) -----

  private static isFreelancer(req: Request): boolean {
    const user = req.user as { id?: number; role?: string; profile_type?: string } | undefined;
    if (!user) return false;
    const role = user.role?.toLowerCase();
    const profileType = (user as any).profile_type?.toLowerCase();
    return role === 'freelancer' || role === 'service-provider' || profileType === 'freelancer';
  }

  /** If JWT has no role, fetch from DB so old tokens / missing payload still work. */
  private static async ensureFreelancer(req: Request): Promise<boolean> {
    if (BillingController.isFreelancer(req)) return true;
    const userId = req.user?.id;
    if (!userId) return false;
    const dbUser = await prisma.user.findUnique({
      where: { id: Number(userId) },
      select: { role: true }
    });
    if (!dbUser) return false;
    const role = (dbUser.role || '').toLowerCase();
    const ok = role === 'freelancer' || role === 'service-provider';
    if (ok && req.user) (req.user as any).role = dbUser.role;
    return ok;
  }

  static async getWithdrawalMethods(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return ApiResponse.error(res, "User not authenticated", 401);
      if (!(await BillingController.ensureFreelancer(req))) return ApiResponse.error(res, "Only freelancers can manage withdrawal methods", 403);
      const result = await BillingService.getWithdrawalMethods(userId.toString());
      return ApiResponse.success(res, result.data);
    } catch (error: any) {
      console.error("Error fetching withdrawal methods:", error);
      return ApiResponse.error(res, error.message || "Failed to fetch withdrawal methods");
    }
  }

  static async createWithdrawalMethod(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return ApiResponse.error(res, "User not authenticated", 401);
      if (!(await BillingController.ensureFreelancer(req))) return ApiResponse.error(res, "Only freelancers can add withdrawal methods", 403);
      const result = await BillingService.createWithdrawalMethod(userId.toString(), req.body);
      return ApiResponse.success(res, result.data, result.message);
    } catch (error: any) {
      console.error("Error creating withdrawal method:", error);
      return ApiResponse.error(res, error.message || "Failed to create withdrawal method");
    }
  }

  static async setDefaultWithdrawalMethod(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return ApiResponse.error(res, "User not authenticated", 401);
      if (!(await BillingController.ensureFreelancer(req))) return ApiResponse.error(res, "Only freelancers can update withdrawal methods", 403);
      const methodId = getStringParam(req.params.withdrawalMethodId);
      if (!methodId) return ApiResponse.error(res, "Withdrawal method ID is required", 400);
      await BillingService.setDefaultWithdrawalMethod(userId.toString(), methodId);
      return ApiResponse.success(res, null, "Default withdrawal method updated");
    } catch (error: any) {
      console.error("Error setting default withdrawal method:", error);
      return ApiResponse.error(res, error.message || "Failed to update withdrawal method");
    }
  }

  static async deleteWithdrawalMethod(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return ApiResponse.error(res, "User not authenticated", 401);
      if (!(await BillingController.ensureFreelancer(req))) return ApiResponse.error(res, "Only freelancers can remove withdrawal methods", 403);
      const methodId = getStringParam(req.params.withdrawalMethodId);
      if (!methodId) return ApiResponse.error(res, "Withdrawal method ID is required", 400);
      await BillingService.deleteWithdrawalMethod(userId.toString(), methodId);
      return ApiResponse.success(res, null, "Withdrawal method removed");
    } catch (error: any) {
      console.error("Error deleting withdrawal method:", error);
      return ApiResponse.error(res, error.message || "Failed to delete withdrawal method");
    }
  }

  static async requestWithdrawal(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return ApiResponse.error(res, "User not authenticated", 401);
      if (!(await BillingController.ensureFreelancer(req))) return ApiResponse.error(res, "Only freelancers can request withdrawals", 403);
      const { amount, withdrawalMethodId } = req.body;
      const amountNum = amount != null ? Number(amount) : NaN;
      const methodIdNum = withdrawalMethodId != null ? parseInt(String(withdrawalMethodId), 10) : NaN;
      if (!Number.isFinite(amountNum) || !Number.isFinite(methodIdNum)) {
        return ApiResponse.error(res, "Amount and withdrawal method ID are required", 400);
      }
      const result = await BillingService.requestWithdrawal(userId.toString(), amountNum, methodIdNum);
      if (!result.success) return ApiResponse.error(res, result.message, 400);
      return ApiResponse.success(res, result.data, result.message);
    } catch (error: any) {
      console.error("Error requesting withdrawal:", error);
      return ApiResponse.error(res, error.message || "Failed to request withdrawal");
    }
  }

  // Download invoice PDF
  static async downloadInvoice(req: Request, res: Response) {
    try {
      const { uniqueId } = req.params;

      if (!uniqueId || Array.isArray(uniqueId)) {
        return ApiResponse.error(res, "Transaction ID is required", 400);
      }

      const result = await BillingService.getInvoicePath(uniqueId as string);

      if (!result.success) {
        return ApiResponse.error(res, result.message, 404);
      }

      // Send PDF file
      res.download(result.path!, `invoice-${uniqueId}.pdf`, (err) => {
        if (err) {
          console.error("Error downloading invoice:", err);
          return ApiResponse.error(res, "Failed to download invoice");
        }
      });
    } catch (error: any) {
      console.error("Error downloading invoice:", error);
      return ApiResponse.error(res, error.message || "Failed to download invoice");
    }
  }
}
