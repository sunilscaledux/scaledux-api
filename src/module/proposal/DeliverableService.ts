import { prisma } from "@services/prismaService";
import { ServiceResponse } from "@utils/ApiResponse";
import { extractRelativePath } from "@utils/General";
import { ConversationService } from "@module/chat/ConversationService";
import { dispatch } from '@queues/Queue';
import { NotificationJob } from '../../jobs/NotificationJob';
import { NotificationEmailJob } from '../../jobs/NotificationEmailJob';
import { CHAT_SYSTEM_MESSAGES } from "../../constants/chatSystemMessages";
import { MilestoneStatus } from "@constants/status";

/**
 * Submit one deliverable (freelancer only). Sets status SUBMITTED, stores remark + files; clears feedback.
 * Milestone is set to COMPLETED only when all deliverables are APPROVED (see approveDeliverable).
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
  const submittedFileRelative = files.map((f: { url: string; name?: string }) => ({
    url: extractRelativePath(f.url),
    name: f.name
  })).filter((f: { url: string }) => Boolean(f.url));
  await (prisma as any).deliverable.update({
    where: { id: deliverable.id },
    data: {
      status: "SUBMITTED",
      submitted_at: now,
      submitted_remark: remark != null && String(remark).trim() !== "" ? String(remark).trim() : null,
      submitted_file: submittedFileRelative,
      feedback: null
    }
  });

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
  const proposalUniqueId = deliverable.milestone.proposal.unique_id;
  const proposalId = deliverable.milestone.proposal.id;
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
        activityId: proposalUniqueId,
        projectTitle,
        milestoneTitle: deliverable.milestone.title,
        deliverableDescription: deliverable.description,
        messageSent: `${CHAT_SYSTEM_MESSAGES.DELIVERABLE_SUBMITTED_SENT} ${projectTitle}`.trim(),
        messageReceived: `${CHAT_SYSTEM_MESSAGES.DELIVERABLE_SUBMITTED_RECEIVED} ${projectTitle}`.trim()
      },
      project.id,
      userId
    );
    const baseUrl = process.env.CLIENT_APP_URL || process.env.APP_URL || "";
    const notifData = { userId: projectOwnerId, type: 'DELIVERABLE_SUBMITTED' as const, notificationTitle: 'Deliverable submitted', notificationBody: `A freelancer submitted a deliverable for "${projectTitle}".`, notificationLink: `${baseUrl}/proposals-and-offers/${proposalUniqueId}`, actorId: userId, subjectType: 'Proposal' as const, subjectId: proposalId };
    await dispatch(NotificationJob, notifData);
    await dispatch(NotificationEmailJob, notifData);
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
      approved_at: null,
      feedback: feedbackText
    }
  });

  await (prisma as any).milestone.update({
    where: { id: deliverable.milestone_id },
    data: { status: MilestoneStatus.PENDING }
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

/**
 * Approve a submitted deliverable (founder only). Sets status to APPROVED.
 */
export async function approveDeliverable(
  userId: number,
  deliverableUniqueId: string
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
    return { success: false, message: "Only the project owner can approve this deliverable" };
  }
  if (deliverable.status === "APPROVED") {
    return { success: true, message: "Deliverable is already approved" };
  }
  if (deliverable.status !== "SUBMITTED") {
    if (deliverable.status === "CHANGES_REQUESTED") {
      return { success: false, message: "Wait for the freelancer to resubmit after your change request" };
    }
    return { success: false, message: "Deliverable must be submitted by the freelancer before you can approve it" };
  }

  const now = new Date();
  await (prisma as any).deliverable.update({
    where: { id: deliverable.id },
    data: { status: "APPROVED", approved_at: now }
  });

  // Set milestone to COMPLETED only when all deliverables in this milestone are APPROVED
  const allDeliverables = await (prisma as any).deliverable.findMany({
    where: { milestone_id: deliverable.milestone_id }
  });
  const allApproved = allDeliverables.every((d: any) => d.status === "APPROVED");
  if (allApproved) {
    await (prisma as any).milestone.update({
      where: { id: deliverable.milestone_id },
      data: { status: MilestoneStatus.COMPLETED }
    });
  }

  const { createProposalActivity } = await import("./ProposalActivityService");
  await createProposalActivity(
    deliverable.milestone.proposal.unique_id,
    "STATUS_CHANGE",
    {
      message: `Approved deliverable: ${deliverable.description}`,
      milestoneTitle: deliverable.milestone.title,
      deliverableDescription: deliverable.description
    },
    userId
  );

  const project = deliverable.milestone.proposal.project;
  const proposalUniqueId = deliverable.milestone.proposal.unique_id;
  const proposalId = deliverable.milestone.proposal.id;
  if (project?.id != null && project?.user_id != null) {
    const projectOwnerId = project.user_id;
    const providerId = deliverable.milestone.proposal.provider_id;
    const projectTitle = project.project_title ?? "";
    await ConversationService.syncSystemMessage(
      projectOwnerId,
      providerId,
      "",
      {
        activityType: "deliverable_approved",
        activityId: proposalUniqueId,
        projectTitle,
        milestoneTitle: deliverable.milestone.title,
        deliverableDescription: deliverable.description,
        messageSent: `${CHAT_SYSTEM_MESSAGES.DELIVERABLE_APPROVED_SENT ?? "You approved deliverable for"} ${projectTitle}`.trim(),
        messageReceived: `${CHAT_SYSTEM_MESSAGES.DELIVERABLE_APPROVED_RECEIVED ?? "Client approved your deliverable for"} ${projectTitle}`.trim()
      },
      project.id,
      userId
    );
    const baseUrl = process.env.CLIENT_APP_URL || process.env.APP_URL || "";
    const notifData = { userId: providerId, type: 'DELIVERABLE_APPROVED' as const, notificationTitle: 'Deliverable approved', notificationBody: `Your deliverable for "${projectTitle}" was approved.`, notificationLink: `${baseUrl}/proposals-and-offers/${proposalUniqueId}`, actorId: userId, subjectType: 'Proposal' as const, subjectId: proposalId };
    await dispatch(NotificationJob, notifData);
    await dispatch(NotificationEmailJob, notifData);
  }

  return { success: true, message: "Deliverable approved successfully" };
}
