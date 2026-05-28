import { prisma } from "@services/prismaService";
import { Log } from "@services/loggerService";
import { dispatch } from "@queues/Queue";
import { NotificationEmailJob } from "../../jobs/NotificationEmailJob";
import { appConfig } from "@config/app";

/**
 * Remind mentors to add a meeting link. Runs every 2 min.
 * Sends up to 3 emails per booking (only if meeting_link is still null):
 *   1. ~10 min after booking confirmed
 *   2. ~1 hour before the call
 *   3. ~10 min before the call
 *
 * Uses BookingActivity to track which reminders were already sent.
 * If mentor adds the link at any point → meeting_link is no longer null → skipped.
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

const REMINDERS = [
  { key: 'LINK_REMINDER_AFTER_BOOKING', urgency: "Don't forget to add a meeting link" },
  { key: 'LINK_REMINDER_1HR_BEFORE', urgency: 'Your call starts in about 1 hour' },
  { key: 'LINK_REMINDER_10MIN_BEFORE', urgency: 'Your call starts in ~10 minutes' },
] as const;

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

  await (prisma as any).bookingActivity.create({
    data: { booking_id: booking.id, action: key, acted_by: booking.mentor_id },
  });

  return true;
}

export async function handle(): Promise<void> {
  const now = new Date();
  const nowMs = now.getTime();

  // Base filter: confirmed, no meeting link, call hasn't started yet
  const base = {
    status: 'CONFIRMED',
    meeting_link: null,
    scheduled_at: { gt: now },
  };

  // 1. Bookings confirmed >= 10 min ago
  const afterBooking = await (prisma as any).booking.findMany({
    where: { ...base, created_at: { lte: new Date(nowMs - 10 * 60 * 1000) } },
    include: { user: { select: { first_name: true, last_name: true } } },
    take: 50,
  });

  // 2. Call starts within 1 hour
  const oneHrBefore = await (prisma as any).booking.findMany({
    where: { ...base, scheduled_at: { gt: now, lte: new Date(nowMs + 60 * 60 * 1000) } },
    include: { user: { select: { first_name: true, last_name: true } } },
    take: 50,
  });

  // 3. Call starts within 10 min
  const tenMinBefore = await (prisma as any).booking.findMany({
    where: { ...base, scheduled_at: { gt: now, lte: new Date(nowMs + 10 * 60 * 1000) } },
    include: { user: { select: { first_name: true, last_name: true } } },
    take: 50,
  });

  let sent = 0;

  for (const b of afterBooking) {
    try { if (await sendReminder(b, REMINDERS[0].key, REMINDERS[0].urgency)) sent++; }
    catch (err) { Log.error(`[meeting-link-reminder] Failed for booking ${b.id}`, { err }); }
  }

  for (const b of oneHrBefore) {
    try { if (await sendReminder(b, REMINDERS[1].key, REMINDERS[1].urgency)) sent++; }
    catch (err) { Log.error(`[meeting-link-reminder] Failed for booking ${b.id}`, { err }); }
  }

  for (const b of tenMinBefore) {
    try { if (await sendReminder(b, REMINDERS[2].key, REMINDERS[2].urgency)) sent++; }
    catch (err) { Log.error(`[meeting-link-reminder] Failed for booking ${b.id}`, { err }); }
  }

  if (sent > 0) {
    Log.info(`[meeting-link-reminder] Sent ${sent} reminder(s)`);
  }
}
