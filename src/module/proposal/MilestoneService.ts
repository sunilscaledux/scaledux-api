import { prisma } from "@services/prismaService";
import { ServiceResponse } from "@utils/ApiResponse";

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
  if (milestone.status === "COMPLETED" || milestone.status === "PAID") {
    return { success: false, message: "Milestone is already submitted or paid" };
  }

  await (prisma as any).milestone.update({
    where: { id: milestone.id },
    data: { status: "COMPLETED" }
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
  if (milestone.status !== "COMPLETED") {
    return { success: false, message: "Milestone is not submitted for review" };
  }

  await (prisma as any).milestone.update({
    where: { id: milestone.id },
    data: { status: "PENDING" }
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
  if (milestone.payment_status === "RELEASED") {
    return { success: false, message: "Payment for this milestone is already released" };
  }

  const deliverables = await (prisma as any).deliverable.findMany({
    where: { milestone_id: milestone.id }
  });
  const allApproved = deliverables.length > 0 && deliverables.every((d: any) => d.status === "APPROVED");
  if (!allApproved) {
    return { success: false, message: "Approve all deliverables before releasing payment" };
  }

  await (prisma as any).milestone.update({
    where: { id: milestone.id },
    data: { payment_status: "RELEASED", status: "PAID" }
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

  return { success: true, message: "Payment released successfully" };
}
