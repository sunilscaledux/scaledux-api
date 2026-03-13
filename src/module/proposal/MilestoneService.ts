import { prisma } from "@services/prismaService";
import { ServiceResponse } from "@utils/ApiResponse";
import { BillingService } from "../billing/BillingService";
import { queueNotification } from "@services/notificationQueueService";
import { MilestoneStatus, MilestonePaymentStatus, BillingTransactionType, BillingTransactionStatus } from "@constants/status";

/**
 * Submit milestone as complete (freelancer only). Sets status COMPLETED.
 * Submitted work is stored per deliverable; use deliverable submit for files/remark.
 */
export async function submitMilestone(
  userId: number,
  milestoneUniqueId: string,
  _remark: string | undefined,
  _submittedFileUrls: { url: string; name?: string }[]
): Promise<ServiceResponse> {
  const milestone = await (prisma as any).milestone.findFirst({
    where: { unique_id: milestoneUniqueId },
    include: {
      proposal: { select: { id: true, provider_id: true } }
    }
  });
  if (!milestone) {
    return { success: false, message: "Milestone not found" };
  }
  if (milestone.proposal.provider_id !== userId) {
    return { success: false, message: "Only the freelancer (proposal provider) can submit this milestone" };
  }
  if (milestone.status === MilestoneStatus.COMPLETED || milestone.status === MilestoneStatus.PAID) {
    return { success: false, message: "Milestone is already submitted or paid" };
  }

  await (prisma as any).milestone.update({
    where: { id: milestone.id },
    data: { status: MilestoneStatus.COMPLETED }
  });

  return { success: true, message: "Milestone submitted successfully" };
}

/**
 * Request changes on a submitted milestone (founder/project owner only).
 * Resets milestone status to PENDING so freelancer can resubmit.
 */
export async function requestChangesMilestone(
  userId: number,
  milestoneUniqueId: string,
  message: string | undefined
): Promise<ServiceResponse> {
  const milestone = await (prisma as any).milestone.findFirst({
    where: { unique_id: milestoneUniqueId },
    include: {
      proposal: { select: { id: true, unique_id: true, project_id: true } },
      project: { select: { user_id: true } }
    }
  });
  if (!milestone) {
    return { success: false, message: "Milestone not found" };
  }
  if (milestone.project.user_id !== userId) {
    return { success: false, message: "Only the project owner can request changes on this milestone" };
  }
  if (milestone.status !== MilestoneStatus.COMPLETED) {
    return { success: false, message: "Milestone is not submitted for review" };
  }

  await (prisma as any).milestone.update({
    where: { id: milestone.id },
    data: { status: MilestoneStatus.PENDING }
  });

  const { createProposalActivity } = await import("./ProposalActivityService");
  await createProposalActivity(
    milestone.proposal.unique_id,
    "REQUEST_MODIFY",
    { message: message?.trim() || "Requested changes on milestone", milestoneTitle: milestone.title },
    userId
  );

  return { success: true, message: "Changes requested successfully" };
}

/**
 * Approve a milestone (founder/project owner only). Sets is_approved = true so the milestone is locked and freelancer can work on it.
 * Optional remark is stored as client message on the milestone.
 */
export async function approveMilestone(
  userId: number,
  milestoneUniqueId: string,
  remark?: string | null
): Promise<ServiceResponse> {
  const milestone = await (prisma as any).milestone.findFirst({
    where: { unique_id: milestoneUniqueId },
    include: {
      proposal: { select: { id: true, unique_id: true, provider_id: true } },
      project: { select: { user_id: true, project_title: true, unique_id: true } }
    }
  });
  if (!milestone) {
    return { success: false, message: "Milestone not found" };
  }
  if (milestone.project.user_id !== userId) {
    return { success: false, message: "Only the project owner (founder) can approve milestones" };
  }
  if (milestone.is_approved === true) {
    return { success: false, message: "Milestone is already approved" };
  }

  const remarkValue =
    remark != null && String(remark).trim() !== "" ? String(remark).trim() : null;
  await (prisma as any).milestone.update({
    where: { id: milestone.id },
    data: { is_approved: true, remark: remarkValue }
  });

  const { createProposalActivity } = await import("./ProposalActivityService");
  await createProposalActivity(
    milestone.proposal.unique_id,
    "STATUS_CHANGE",
    { message: `Milestone "${milestone.title}" approved`, milestoneTitle: milestone.title },
    userId
  );

  const { ConversationService } = await import("./../chat/ConversationService");
  const { CHAT_SYSTEM_MESSAGES } = await import("../../constants/chatSystemMessages");
  const projectTitle = milestone.project?.project_title ?? "";
  await ConversationService.syncSystemMessage(
    milestone.project.user_id,
    milestone.proposal.provider_id,
    "",
    {
      activityType: "milestone_approved",
      activityId: milestone.proposal.unique_id,
      projectTitle,
      milestoneTitle: milestone.title,
      messageSent: `${CHAT_SYSTEM_MESSAGES.MILESTONE_APPROVED_SENT ?? "Milestone approved"}: ${milestone.title}`.trim(),
      messageReceived: `${CHAT_SYSTEM_MESSAGES.MILESTONE_APPROVED_RECEIVED ?? "Client approved milestone"}: ${milestone.title}`.trim()
    },
    milestone.project_id,
    userId
  );

  return { success: true, message: "Milestone approved successfully" };
}

/**
 * Release payment for a milestone (founder only). Sets milestone payment_status to RELEASED.
 * All deliverables in the milestone must be APPROVED before release.
 */
export async function releaseMilestonePayment(
  userId: number,
  milestoneUniqueId: string
): Promise<ServiceResponse> {
  const milestone = await (prisma as any).milestone.findFirst({
    where: { unique_id: milestoneUniqueId },
    include: {
      proposal: { select: { id: true, unique_id: true, provider_id: true } },
      project: { select: { user_id: true, project_title: true, unique_id: true } }
    }
  });
  if (!milestone) {
    return { success: false, message: "Milestone not found" };
  }
  if (milestone.project.user_id !== userId) {
    return { success: false, message: "Only the project owner can release payment for this milestone" };
  }
  if (milestone.payment_status === MilestonePaymentStatus.RELEASED) {
    return { success: false, message: "Payment for this milestone is already released" };
  }

  const deliverables = await (prisma as any).deliverable.findMany({
    where: { milestone_id: milestone.id }
  });
  const allApproved = deliverables.length > 0 && deliverables.every((d: any) => d.status === "APPROVED");
  if (!allApproved) {
    return { success: false, message: "Approve all deliverables before releasing payment" };
  }

  // Find the pending billing transaction for this milestone and release it (by milestone_id or fallback to meta)
  let txn = await (prisma as any).billingTransaction.findFirst({
    where: {
      milestone_id: milestone.id,
      type: BillingTransactionType.PAYMENT,
      status: BillingTransactionStatus.PENDING
    }
  });
  if (!txn) {
    const pendingTxns = await (prisma as any).billingTransaction.findMany({
      where: {
        subject_type: "Proposal",
        subject_id: milestone.proposal.id,
        type: BillingTransactionType.PAYMENT,
        status: BillingTransactionStatus.PENDING
      }
    });
    const milestoneIndex = milestone.order_index;
    txn = pendingTxns.find((t: any) => {
      const m = t.meta as Record<string, unknown> | null;
      return m && String(m.milestone_index) === String(milestoneIndex);
    }) ?? null;
  }
  if (txn) {
    const releaseResult = await BillingService.releasePaymentTransaction(txn.unique_id, userId);
    if (!releaseResult.success) {
      return { success: false, message: releaseResult.message ?? "Failed to release payment" };
    }
  }

  await (prisma as any).milestone.update({
    where: { id: milestone.id },
    data: { payment_status: MilestonePaymentStatus.RELEASED, status: MilestoneStatus.PAID }
  });

  const { createProposalActivity } = await import("./ProposalActivityService");
  await createProposalActivity(
    milestone.proposal.unique_id,
    "MILESTONE_PAYMENT",
    {
      milestoneTitle: milestone.title,
      amount: Number(milestone.amount),
      message: `Released payment for milestone: ${milestone.title}`
    },
    userId
  );

  const projectTitle = milestone.project?.project_title ?? "Project";
  const baseUrl = process.env.CLIENT_APP_URL || process.env.APP_URL || "";
  await queueNotification({
    userId: milestone.proposal.provider_id,
    type: "PAYMENT_RELEASED",
    notificationTitle: "Payment released",
    notificationBody: `Payment for "${projectTitle}" (milestone: ${milestone.title}) was released.`,
    notificationLink: `${baseUrl}/proposals-and-offers/${milestone.proposal.unique_id}`,
    actorId: userId,
    subjectType: "Proposal",
    subjectId: milestone.proposal.id
  });

  // Chat sync is done in BillingService.releasePaymentTransaction so both milestone flow and direct billing release get it
  return { success: true, message: "Payment released successfully" };
}
