import { prisma } from "@services/prismaService";
import { Log } from "@services/loggerService";
import { dispatch } from "@queues/Queue";
import { NotificationEmailJob } from "../../jobs/NotificationEmailJob";
import { appConfig } from "@config/app";

/**
 * Remind mentors to add a meeting link. Runs every 2 min.
 *
 * Reminder schedule:
 *   1. Immediately after booking is confirmed (first cron tick)
 *   2. Once per day (daily digest) while the call is >1 hour away
 *   3. 1 hour before the call
 *   4. 10 minutes before the call
 *
 * Uses BookingActivity to track which reminders were already sent.
 * If mentor adds the link at any point the booking is skipped.
 */
export const name = "meeting-link-reminder";
export const schedule = "*/2 * * * *";

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const NOTIF_TZ = 'Asia/Kolkata';
function formatNotifDate(date: Date): string {
  const d = new Intl.DateTimeFormat('en-US', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric', timeZone: NOTIF_TZ }).format(date);
  const t = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: NOTIF_TZ }).format(date);
  return `${d} at ${t}`;
}

function todayDateKey(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: NOTIF_TZ }).format(new Date());
}

async function alreadySent(bookingId: number, key: string): Promise<boolean> {
  const existing = await (prisma as any).bookingActivity.findFirst({
    where: { booking_id: bookingId, action: key },
    select: { id: true },
  });
  return !!existing;
}

async function sendReminder(booking: any, key: string, urgency: string): Promise<boolean> {
  if (await alreadySent(booking.id, key)) return false;

  const founderName = `${booking.user.first_name} ${booking.user.last_name}`.trim();
  const dateStr = formatNotifDate(new Date(booking.scheduled_at));

  const body = `<p><strong>${urgency}</strong></p>
    <p>Your 1:1 video call with <strong>${escapeHtml(founderName)}</strong> is scheduled for <strong>${escapeHtml(dateStr)}</strong> (${booking.duration} minutes).</p>
    <p>Please add a meeting link so ${escapeHtml(founderName)} can join the call.</p>`;

  await (prisma as any).bookingActivity.create({
    data: { booking_id: booking.id, action: key, acted_by: booking.mentor_id },
  });

  await dispatch(NotificationEmailJob, {
    userId: booking.mentor_id,
    type: 'MEETING_LINK_REMINDER' as const,
    notificationTitle: urgency,
    notificationBody: body,
    notificationLink: `${appConfig.frontendUrl}/my-bookings`,
    actorId: booking.user_id,
    subjectType: 'Booking' as const,
    subjectId: booking.id,
  });

  return true;
}

export async function handle(): Promise<void> {
  const now = new Date();
  const nowMs = now.getTime();

  // All confirmed bookings with no meeting link and call still in the future
  const bookings = await (prisma as any).booking.findMany({
    where: {
      status: 'CONFIRMED',
      meeting_link: null,
      scheduled_at: { gt: now },
    },
    include: { user: { select: { first_name: true, last_name: true } } },
    take: 200,
  });

  let sent = 0;

  for (const b of bookings) {
    try {
      const callMs = new Date(b.scheduled_at).getTime();
      const msUntilCall = callMs - nowMs;

      // 1. Immediate — first cron tick after confirmation
      if (await tryReminder(b, 'LINK_REMINDER_AFTER_BOOKING', "Don't forget to add a meeting link for your upcoming call")) sent++;

      // 2. Daily — one per calendar day while call is >1 hour away
      if (msUntilCall > 60 * 60 * 1000) {
        const dailyKey = `LINK_REMINDER_DAILY_${todayDateKey()}`;
        if (await tryReminder(b, dailyKey, 'Reminder: please add a meeting link for your upcoming call')) sent++;
      }

      // 3. 1 hour before
      if (msUntilCall <= 60 * 60 * 1000) {
        if (await tryReminder(b, 'LINK_REMINDER_1HR_BEFORE', 'Your call starts in about 1 hour — please add a meeting link')) sent++;
      }

      // 4. 10 minutes before
      if (msUntilCall <= 10 * 60 * 1000) {
        if (await tryReminder(b, 'LINK_REMINDER_10MIN_BEFORE', 'Your call starts in ~10 minutes — add a meeting link now!')) sent++;
      }
    } catch (err) {
      Log.error(`[meeting-link-reminder] Failed for booking ${b.id}`, { err });
    }
  }

  if (sent > 0) {
    Log.info(`[meeting-link-reminder] Sent ${sent} reminder(s)`);
  }
}

async function tryReminder(booking: any, key: string, urgency: string): Promise<boolean> {
  try {
    return await sendReminder(booking, key, urgency);
  } catch (err) {
    Log.error(`[meeting-link-reminder] Failed ${key} for booking ${booking.id}`, { err });
    return false;
  }
}
