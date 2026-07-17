import { prisma } from "@services/prismaService";
import { Log } from "@services/loggerService";
import { dispatch } from "@queues/Queue";
import { NotificationJob } from "../../jobs/NotificationJob";
import { NotificationEmailJob } from "../../jobs/NotificationEmailJob";
import { appConfig } from "@config/app";
import { ConversationService } from "../../module/chat/ConversationService";
import { ProposalStatus } from "@constants/status";
import { CHAT_SYSTEM_MESSAGES } from "@constants/chatSystemMessages";

/**
 * Auto-expire offers the freelancer hasn't taken up within OFFER_EXPIRY_HOURS
 * (default 24h), signing the NDA where required, accepting otherwise.
 *
 * Runs every 15 minutes.
 */
export const name = "offer-auto-expiry";
export const schedule = "*/15 * * * *";

export async function handle(): Promise<void> {
  const now = new Date();

  // Find proposals with OFFER_SENT status where NDA offer has expired and is not signed
  const expired = await (prisma as any).proposal.findMany({
    where: {
      status: ProposalStatus.OFFER_SENT,
      proposalNda: {
        offer_expires_at: { not: null, lte: now },
        is_nda_signed: false,
      },
    },
    include: {
      proposalNda: true,
      provider: { select: { id: true, first_name: true, last_name: true } },
      founder: { select: { id: true, first_name: true, last_name: true } },
      project: { select: { id: true, unique_id: true, project_title: true, is_nda_required: true } },
    },
    take: 50,
  });

  if (expired.length === 0) return;

  let count = 0;

  for (const proposal of expired) {
    try {
      // Update proposal status to WITHDRAWN
      await (prisma as any).proposal.update({
        where: { id: proposal.id },
        data: { status: ProposalStatus.WITHDRAWN },
      });

      const projectTitle = proposal.project?.project_title || "Project";
      const founderName = `${proposal.founder?.first_name || ""} ${proposal.founder?.last_name || ""}`.trim();
      const providerName = `${proposal.provider?.first_name || ""} ${proposal.provider?.last_name || ""}`.trim();

      // Only NDA projects lapse for an unsigned NDA; others simply went unanswered.
      const lapseCause = proposal.project?.is_nda_required === true
        ? "the NDA was not signed within the deadline"
        : "it was not accepted within the deadline";

      // Notify the freelancer
      const providerNotif = {
        userId: proposal.provider_id,
        type: "OFFER_EXPIRED" as const,
        notificationTitle: `Offer expired for "${projectTitle}"`,
        notificationBody: `The offer from ${founderName} for "${projectTitle}" has expired because ${lapseCause}.`,
        notificationLink: `${appConfig.frontendUrl}/proposals-and-offers/${proposal.unique_id}`,
        actorId: null,
        subjectType: "Proposal" as const,
        subjectId: proposal.id,
      };
      await dispatch(NotificationJob, providerNotif);
      await dispatch(NotificationEmailJob, providerNotif);

      // Notify the founder
      const founderNotif = {
        userId: proposal.founder_id,
        type: "OFFER_EXPIRED" as const,
        notificationTitle: `Offer expired for "${projectTitle}"`,
        notificationBody: `Your offer to ${providerName} for "${projectTitle}" has expired because ${lapseCause}.`,
        notificationLink: `${appConfig.frontendUrl}/project/${proposal.project?.unique_id}`,
        actorId: null,
        subjectType: "Proposal" as const,
        subjectId: proposal.id,
      };
      await dispatch(NotificationJob, founderNotif);
      await dispatch(NotificationEmailJob, founderNotif);

      // Sync to chat
      await ConversationService.syncSystemMessage(
        proposal.founder_id,
        proposal.provider_id,
        "",
        {
          activityType: "offer_expired",
          activityId: proposal.project?.unique_id,
          projectTitle,
          messageSent: `${CHAT_SYSTEM_MESSAGES.OFFER_CANCELLED_SENT} ${projectTitle}: ${lapseCause}`,
          messageReceived: `${CHAT_SYSTEM_MESSAGES.OFFER_CANCELLED_RECEIVED} ${projectTitle}: ${lapseCause}`,
        },
        proposal.project?.id,
      );

      count += 1;
    } catch (err) {
      Log.error(`[offer-auto-expiry] Failed for proposal ${proposal.id}`, { err });
    }
  }

  if (count > 0) {
    Log.info(`[offer-auto-expiry] Auto-expired ${count} offer(s)`);
  }
}
