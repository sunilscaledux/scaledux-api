import { prisma } from "@services/prismaService";
import { ServiceResponse } from "@utils/ApiResponse";

/**
 * Add a document to a milestone (freelancer only - the proposal provider).
 */
export async function addMilestoneDocument(
  userId: number,
  milestoneUniqueId: string,
  fileUrl: string
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
    return { success: false, message: "Only the freelancer (proposal provider) can upload milestone documents" };
  }
  if (!fileUrl || typeof fileUrl !== "string" || !fileUrl.trim()) {
    return { success: false, message: "file_url is required" };
  }

  const existingCount = await (prisma as any).milestoneDocument.count({
    where: { milestone_id: milestone.id }
  });
  if (existingCount >= 5) {
    return { success: false, message: "Maximum 5 files per milestone. You have already uploaded 5 files." };
  }

  await (prisma as any).milestoneDocument.create({
    data: {
      milestone_id: milestone.id,
      file_url: fileUrl.trim(),
      uploaded_by_user_id: userId
    }
  });

  return { success: true, message: "Document added to milestone" };
}

/**
 * Submit milestone as complete (freelancer only). Sets status COMPLETED, submitted_at, submitted_remark.
 * Freelancer should upload deliverable files (via addMilestoneDocument) then call this with optional remark.
 */
export async function submitMilestone(
  userId: number,
  milestoneUniqueId: string,
  remark: string | undefined
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

  const now = new Date();
  await (prisma as any).milestone.update({
    where: { id: milestone.id },
    data: {
      status: "COMPLETED",
      submitted_at: now,
      submitted_remark: remark != null && String(remark).trim() !== "" ? String(remark).trim() : null
    }
  });

  return { success: true, message: "Milestone submitted successfully" };
}
