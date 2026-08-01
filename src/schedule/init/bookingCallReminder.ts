import { prisma } from "@services/prismaService";
import { Log } from "@services/loggerService";
import { dispatch } from "@queues/Queue";
import { NotificationJob } from "../../jobs/NotificationJob";
import { NotificationEmailJob } from "../../jobs/NotificationEmailJob";
import { getMaskedName } from "@utils/General";
import { appConfig } from "@config/app";

/**
 * Remind both parties that a confirmed call is coming up, at 1 hour before,
 * 10 minutes before, and at the start time. Runs regardless of whether a
 * meeting link exists — meetingLinkReminder only nudges the mentor when it is
 * missing, so nobody was reminded once the link was added.
 *
 * Deduped per booking per milestone via BookingActivity.
 */
export const name = "booking-call-reminder";
export const schedule = "*/2 * * * *";

const MILESTONES = [
  { key: 'CALL_REMINDER_1HR', from: 60 * 60 * 1000, to: 10 * 60 * 1000, lead: 'in about 1 hour' },
  { key: 'CALL_REMINDER_10MIN', from: 10 * 60 * 1000, to: 0, lead: 'in about 10 minutes' },
  { key: 'CALL_REMINDER_START', from: 0, to: -10 * 60 * 1000, lead: 'now' },
] as const;

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const NOTIF_TZ = 'Asia/Kolkata';
function formatNotifDate(date: Date): string {
  const d = new Intl.DateTimeFormat('en-US', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric', timeZone: NOTIF_TZ }).format(date);
  const t = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: NOTIF_TZ }).format(date);
  return `${d} at ${t}`;
}

async function alreadySent(bookingId: number, key: string): Promise<boolean> {
  const existing = await (prisma as any).bookingActivity.findFirst({
    where: { booking_id: bookingId, action: key },
    select: { id: true },
  });
  return !!existing;
}

function buildBody(booking: any, counterpartName: string, lead: string, isMentor: boolean): string {
  const dateStr = formatNotifDate(new Date(booking.scheduled_at));
  const linkRow = booking.meeting_link
    ? `<tr><td style="padding:8px 0;color:#667085;font-size:14px;">Meeting link</td><td style="padding:8px 0;font-weight:600;font-size:14px;"><a href="${escapeHtml(booking.meeting_link)}" style="color:#7C3AED;">Join meeting</a></td></tr>`
    : `<tr><td style="padding:8px 0;color:#667085;font-size:14px;">Meeting link</td><td style="padding:8px 0;font-weight:600;font-size:14px;color:#B42318;">${isMentor ? 'Not added yet — please add one now' : 'Not added yet by the mentor'}</td></tr>`;

  return `<p>Your 1:1 video call with <strong>${escapeHtml(counterpartName)}</strong> starts <strong>${escapeHtml(lead)}</strong>.</p>
    <table style="border-collapse:collapse;margin:16px 0;width:100%;max-width:480px;">
      <tr><td style="padding:8px 0;color:#667085;font-size:14px;">When</td><td style="padding:8px 0;font-weight:600;font-size:14px;">${escapeHtml(dateStr)}</td></tr>
      <tr><td style="padding:8px 0;color:#667085;font-size:14px;">Duration</td><td style="padding:8px 0;font-weight:600;font-size:14px;">${booking.duration} minutes</td></tr>
      ${linkRow}
    </table>`;
}

async function notify(booking: any, userId: number, actorId: number, title: string, body: string): Promise<void> {
  const payload = {
    userId,
    type: 'BOOKING_CALL_REMINDER' as const,
    notificationTitle: title,
    notificationBody: body,
    notificationLink: `${appConfig.frontendUrl}/my-bookings`,
    actorId,
    subjectType: 'Booking' as const,
    subjectId: booking.id,
  };
  await dispatch(NotificationJob, payload);
  await dispatch(NotificationEmailJob, payload);
}

export async function handle(): Promise<void> {
  const now = new Date();
  const nowMs = now.getTime();

  const bookings = await (prisma as any).booking.findMany({
    where: {
      status: 'CONFIRMED',
      scheduled_at: {
        gt: new Date(nowMs - 12 * 60 * 1000),
        lte: new Date(nowMs + 62 * 60 * 1000),
      },
    },
    include: {
      user: { select: { first_name: true, last_name: true } },
      mentor: { select: { first_name: true, last_name: true } },
    },
    take: 200,
  });

  let sent = 0;

  for (const b of bookings) {
    try {
      const msUntilCall = new Date(b.scheduled_at).getTime() - nowMs;
      const milestone = MILESTONES.find(m => msUntilCall <= m.from && msUntilCall > m.to);
      if (!milestone) continue;
      if (await alreadySent(b.id, milestone.key)) continue;

      await (prisma as any).bookingActivity.create({
        data: { booking_id: b.id, action: milestone.key, acted_by: b.mentor_id },
      });

      const title = milestone.key === 'CALL_REMINDER_START'
        ? 'Your call is starting now'
        : `Your call starts ${milestone.lead}`;
      const founderName = getMaskedName(b.user);
      const mentorName = getMaskedName(b.mentor);

      await notify(b, b.mentor_id, b.user_id, title, buildBody(b, founderName, milestone.lead, true));
      await notify(b, b.user_id, b.mentor_id, title, buildBody(b, mentorName, milestone.lead, false));
      sent++;
    } catch (err) {
      Log.error(`[booking-call-reminder] Failed for booking ${b.id}`, { err });
    }
  }

  if (sent > 0) {
    Log.info(`[booking-call-reminder] Sent reminders for ${sent} booking(s)`);
  }
}
