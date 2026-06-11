import { prisma } from "@services/prismaService";
import { Log } from "@services/loggerService";
import { dispatch } from "@queues/Queue";
import { NotificationJob } from "../../jobs/NotificationJob";
import { NotificationEmailJob } from "../../jobs/NotificationEmailJob";
import { appConfig } from "@config/app";
import { ConversationService } from "../../module/chat/ConversationService";

/**
 * Auto-cancel bookings where the founder has not responded to a mentor's
 * reschedule request within the 48-hour window (reschedule_response_deadline).
 *
 * Runs every 5 minutes.
 */
export const name = "reschedule-auto-cancel";
export const schedule = "*/5 * * * *";

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const NOTIF_TZ = 'Asia/Kolkata';
function formatNotifDate(date: Date): string {
  const d = new Intl.DateTimeFormat('en-US', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric', timeZone: NOTIF_TZ }).format(date);
  const t = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: NOTIF_TZ }).format(date);
  return `${d} at ${t}`;
}

export async function handle(): Promise<void> {
  const now = new Date();

  // Find confirmed bookings where reschedule was requested and deadline has passed
  const expired = await (prisma as any).booking.findMany({
    where: {
      status: 'CONFIRMED',
      reschedule_requested_at: { not: null },
      reschedule_response_deadline: { not: null, lte: now },
    },
    include: {
      mentor: { select: { id: true, first_name: true, last_name: true } },
      user: { select: { id: true, first_name: true, last_name: true } },
    },
    take: 50,
  });

  if (expired.length === 0) return;

  let cancelled = 0;

  for (const booking of expired) {
    try {
      // Cancel the booking
      await (prisma as any).booking.update({
        where: { id: booking.id },
        data: {
          status: 'CANCELLED',
          cancelled_at: now,
          cancelled_by: null, // system-initiated
          reschedule_requested_at: null,
          reschedule_response_deadline: null,
        },
      });

      await (prisma as any).bookingActivity.create({
        data: {
          booking_id: booking.id,
          action: 'AUTO_CANCELLED',
          reason: 'Reschedule request not responded within deadline',
          acted_by: booking.mentor_id, // mentor triggered the chain
        },
      });

      const mentorName = `${booking.mentor.first_name} ${booking.mentor.last_name}`.trim();
      const founderName = `${booking.user.first_name} ${booking.user.last_name}`.trim();
      const dateStr = formatNotifDate(new Date(booking.scheduled_at));

      const emailBody = `<p>The 1:1 video call scheduled for <strong>${escapeHtml(dateStr)}</strong> has been automatically cancelled because the reschedule request was not responded to within the deadline.</p>
        <p>You can book a new session from your <a href="${appConfig.frontendUrl}/my-bookings" style="color:#7C3AED;">bookings page</a>.</p>`;

      const inAppBody = `The call on ${dateStr} was auto-cancelled — reschedule request expired.`;

      // Notify both parties
      for (const recipientId of [booking.mentor_id, booking.user_id]) {
        const notifData = {
          userId: recipientId,
          type: 'BOOKING_CANCELLED' as const,
          notificationTitle: 'Booking auto-cancelled — reschedule deadline expired',
          notificationBody: emailBody,
          inAppBody,
          notificationLink: `${appConfig.frontendUrl}/my-bookings`,
          actorId: booking.mentor_id,
          subjectType: 'Booking' as const,
          subjectId: booking.id,
        };
        await dispatch(NotificationJob, notifData);
        await dispatch(NotificationEmailJob, notifData);
      }

      // Sync to chat
      await ConversationService.syncSystemMessage(
        booking.user_id, booking.mentor_id,
        `❌ The call was automatically cancelled — the reschedule request was not responded to in time.`,
        {
          activityType: 'BOOKING_CANCELLED',
          bookingTitle: '1:1 Video Call',
          bookingDuration: booking.duration,
          bookingScheduledAt: booking.scheduled_at,
          cancelReason: 'Reschedule request not responded within deadline',
        },
      );

      cancelled += 1;
    } catch (err) {
      Log.error(`[reschedule-auto-cancel] Failed for booking ${booking.id}`, { err });
    }
  }

  if (cancelled > 0) {
    Log.info(`[reschedule-auto-cancel] Auto-cancelled ${cancelled} booking(s)`);
  }
}
