import { prisma } from "@services/prismaService";
import { ServiceResponse } from "@utils/ApiResponse";

/**
 * Submit milestone as complete (freelancer only). Sets status COMPLETED, submitted_at, submitted_remark, submitted_file.
 * Files are passed in the request body (same as deliverable submit); no separate document table.
 */
export async function submitMilestone(
  userId: number,
  milestoneUniqueId: string,
  remark: string | undefined,
  submittedFileUrls: { url: string; name?: string }[]
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

  const files = Array.isArray(submittedFileUrls) ? submittedFileUrls.slice(0, 5) : [];
  const now = new Date();
  await (prisma as any).milestone.update({
    where: { id: milestone.id },
    data: {
      status: "COMPLETED",
      submitted_at: now,
      submitted_remark: remark != null && String(remark).trim() !== "" ? String(remark).trim() : null,
      submitted_file: files
    }
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
    data: {
      status: "PENDING",
      submitted_at: null,
      submitted_remark: null
    }
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
