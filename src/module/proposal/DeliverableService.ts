import { prisma } from "@services/prismaService";
import { ServiceResponse } from "@utils/ApiResponse";
import { ConversationService } from "@module/chat/ConversationService";
import { CHAT_SYSTEM_MESSAGES } from "../../constants/chatSystemMessages";

/**
 * Submit one deliverable (freelancer only). Sets status SUBMITTED, stores remark + files; clears feedback.
 * If all deliverables in the milestone are now SUBMITTED/APPROVED, sets milestone status to COMPLETED.
 */
export async function submitDeliverable(
  userId: number,
  deliverableUniqueId: string,
  remark: string | undefined,
  submittedFileUrls: { url: string; name?: string }[]
): Promise<ServiceResponse> {
  const deliverable = await (prisma as any).deliverable.findFirst({
    where: { unique_id: deliverableUniqueId },
    include: {
      milestone: {
        include: {
          proposal: {
            select: {
              id: true,
              provider_id: true,
              unique_id: true,
              project: { select: { id: true, unique_id: true, user_id: true, project_title: true } }
            }
          }
        }
      }
    }
  });
  const milestoneOrderIndex = deliverable?.milestone?.order_index ?? 0;
  if (!deliverable) {
    return { success: false, message: "Deliverable not found" };
  }
  if (deliverable.milestone.proposal.provider_id !== userId) {
    return { success: false, message: "Only the freelancer (proposal provider) can submit this deliverable" };
  }
  if (deliverable.status === "SUBMITTED" || deliverable.status === "APPROVED") {
    return { success: false, message: "Deliverable is already submitted or approved" };
  }

  const now = new Date();
  const files = Array.isArray(submittedFileUrls) ? submittedFileUrls : [];
  await (prisma as any).deliverable.update({
    where: { id: deliverable.id },
    data: {
      status: "SUBMITTED",
      submitted_at: now,
      submitted_remark: remark != null && String(remark).trim() !== "" ? String(remark).trim() : null,
      submitted_file: files,
      feedback: null
    }
  });

  const allDeliverables = await (prisma as any).deliverable.findMany({
    where: { milestone_id: deliverable.milestone_id }
  });
  const allDone = allDeliverables.every(
    (d: any) => d.status === "SUBMITTED" || d.status === "APPROVED"
  );
  if (allDone) {
    await (prisma as any).milestone.update({
      where: { id: deliverable.milestone_id },
      data: {
        status: "COMPLETED",
        submitted_at: now,
        submitted_remark: null,
        submitted_file: allDeliverables.flatMap((d: any) => (Array.isArray(d.submitted_file) ? d.submitted_file : []))
      }
    });
  }

  const submittedRemark = remark != null && String(remark).trim() !== "" ? String(remark).trim() : undefined;
  const fileLinks = files.map((f: { url: string; name?: string }) => ({ url: f.url, name: f.name }));
  const { createProposalActivity } = await import("./ProposalActivityService");
  await createProposalActivity(
    deliverable.milestone.proposal.unique_id,
    "MILESTONE_SUBMITTED",
    {
      milestoneIndex: milestoneOrderIndex,
      milestoneTitle: deliverable.milestone.title,
      deliverableDescription: deliverable.description,
      remark: submittedRemark,
      submittedFileUrls: fileLinks.length > 0 ? fileLinks : undefined
    },
    userId
  );

  const project = deliverable.milestone.proposal.project;
  if (project?.id != null && project?.user_id != null) {
    const projectOwnerId = project.user_id;
    const providerId = deliverable.milestone.proposal.provider_id;
    const projectTitle = project.project_title ?? "";
    await ConversationService.syncSystemMessage(
      projectOwnerId,
      providerId,
      "",
      {
        activityType: "deliverable_submitted",
        activityId: deliverable.milestone.proposal.unique_id,
        projectTitle,
        milestoneTitle: deliverable.milestone.title,
        deliverableDescription: deliverable.description,
        messageSent: `${CHAT_SYSTEM_MESSAGES.DELIVERABLE_SUBMITTED_SENT} ${projectTitle}`.trim(),
        messageReceived: `${CHAT_SYSTEM_MESSAGES.DELIVERABLE_SUBMITTED_RECEIVED} ${projectTitle}`.trim()
      },
      project.id,
      userId
    );
  }

  return { success: true, message: "Deliverable submitted successfully" };
}

/**
 * Request changes on a submitted deliverable (founder only). Sets status CHANGES_REQUESTED and stores feedback.
 */
export async function requestChangesDeliverable(
  userId: number,
  deliverableUniqueId: string,
  message: string | undefined
): Promise<ServiceResponse> {
  const deliverable = await (prisma as any).deliverable.findFirst({
    where: { unique_id: deliverableUniqueId },
    include: {
      milestone: {
        include: {
          proposal: {
            select: {
              unique_id: true,
              provider_id: true,
              project: { select: { id: true, unique_id: true, user_id: true, project_title: true } }
            }
          }
        }
      }
    }
  });
  if (!deliverable) {
    return { success: false, message: "Deliverable not found" };
  }
  if (deliverable.milestone.proposal.project.user_id !== userId) {
    return { success: false, message: "Only the project owner can request changes on this deliverable" };
  }
  if (deliverable.status !== "SUBMITTED") {
    return { success: false, message: "Deliverable is not submitted for review" };
  }

  const feedbackText = message != null && String(message).trim() !== "" ? String(message).trim() : null;
  await (prisma as any).deliverable.update({
    where: { id: deliverable.id },
    data: {
      status: "CHANGES_REQUESTED",
      submitted_at: null,
      submitted_remark: null,
      submitted_file: [],
      feedback: feedbackText
    }
  });

  await (prisma as any).milestone.update({
    where: { id: deliverable.milestone_id },
    data: { status: "PENDING", submitted_at: null, submitted_remark: null }
  });

  const { createProposalActivity } = await import("./ProposalActivityService");
  await createProposalActivity(
    deliverable.milestone.proposal.unique_id,
    "REQUEST_MODIFY",
    {
      message: feedbackText ?? "Requested changes on deliverable",
      milestoneTitle: deliverable.milestone.title,
      deliverableDescription: deliverable.description
    },
    userId
  );

  const project = deliverable.milestone.proposal.project;
  if (project?.id != null && project?.user_id != null) {
    const projectOwnerId = project.user_id;
    const providerId = deliverable.milestone.proposal.provider_id;
    const projectTitle = project.project_title ?? "";
    await ConversationService.syncSystemMessage(
      projectOwnerId,
      providerId,
      "",
      {
        activityType: "deliverable_request_changes",
        activityId: deliverable.milestone.proposal.unique_id,
        projectTitle,
        milestoneTitle: deliverable.milestone.title,
        deliverableDescription: deliverable.description,
        message: feedbackText,
        feedback: feedbackText,
        messageSent: `${CHAT_SYSTEM_MESSAGES.DELIVERABLE_REQUEST_CHANGES_SENT} ${projectTitle}`.trim(),
        messageReceived: `${CHAT_SYSTEM_MESSAGES.DELIVERABLE_REQUEST_CHANGES_RECEIVED} ${projectTitle}`.trim()
      },
      project.id,
      userId
    );
  }

  return { success: true, message: "Changes requested successfully" };
}
