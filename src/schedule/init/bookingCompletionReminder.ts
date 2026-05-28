import { prisma } from "@services/prismaService";
import { Log } from "@services/loggerService";
import { dispatch } from "@queues/Queue";
import { NotificationEmailJob } from "../../jobs/NotificationEmailJob";
import { appConfig } from "@config/app";

/**
 * Email the mentor a one-time "please mark this call complete" nudge once scheduled_end has passed.
 * Skipped silently if the mentor has already marked the booking COMPLETED (status filter).
 * completion_reminder_sent_at is stamped so the same booking is never reminded twice.
 *
 * Email-only by design — mentors already received in-app notif + chat when the booking was confirmed;
 * this is just a gentle prod via email.
 */
export const name = "booking-completion-reminder";
export const schedule = "*/5 * * * *"; // Every 5 minutes

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

  const due = await (prisma as any).booking.findMany({
    where: {
      status: 'CONFIRMED',
      scheduled_end: { lte: now },
      completion_reminder_sent_at: null,
    },
    include: {
      user: { select: { first_name: true, last_name: true } },
    },
    take: 100,
  });

  if (due.length === 0) return;

  let sent = 0;
  for (const booking of due) {
    try {
      const founderName = `${booking.user.first_name} ${booking.user.last_name}`.trim();
      const dateStr = formatNotifDate(new Date(booking.scheduled_at));
      const title = 'Please mark your call complete';
      const body = `<p>Your 1:1 video call with <strong>${escapeHtml(founderName)}</strong> on <strong>${escapeHtml(dateStr)}</strong> has ended.</p>
        <p>Take a moment to mark it complete — this lets ${escapeHtml(founderName)} leave a review and helps us release your payout.</p>`;
      const link = `${appConfig.frontendUrl}/my-bookings`;

      await dispatch(NotificationEmailJob, {
        userId: booking.mentor_id,
        type: 'BOOKING_COMPLETE_REMINDER' as const,
        notificationTitle: title,
        notificationBody: body,
        notificationLink: link,
        actorId: booking.user_id,
        subjectType: 'Booking' as const,
        subjectId: booking.id,
      });

      await (prisma as any).booking.update({
        where: { id: booking.id },
        data: { completion_reminder_sent_at: new Date() },
      });
      sent += 1;
    } catch (err) {
      Log.error(`[booking-completion-reminder] Failed for booking ${booking.id}`, { err });
    }
  }

  if (sent > 0) {
    Log.info(`[booking-completion-reminder] Sent ${sent} reminder(s)`);
  }
}
