/**
 * Date formatting for notification text (email and in-app).
 *
 * The server runs in UTC but bookings are entered in the user's local time
 * (IST for now), so times are formatted in an explicit zone to match what the
 * browser shows. The zone label is part of the output: without it a reader
 * cannot tell whether "3:30 PM" is their time or the server's.
 */

export const NOTIF_TZ = 'Asia/Kolkata';
export const NOTIF_TZ_LABEL = 'IST';

/** e.g. "Saturday, Aug 1, 2026 at 3:30 PM IST" */
export function formatNotifDate(date: Date): string {
  const d = new Intl.DateTimeFormat('en-US', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric', timeZone: NOTIF_TZ }).format(date);
  const t = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: NOTIF_TZ }).format(date);
  return `${d} at ${t} ${NOTIF_TZ_LABEL}`;
}

/** Date only, no clock time, e.g. "Saturday, Aug 1, 2026 (IST)" */
export function formatNotifDay(date: Date): string {
  const d = new Intl.DateTimeFormat('en-US', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric', timeZone: NOTIF_TZ }).format(date);
  return `${d} (${NOTIF_TZ_LABEL})`;
}

/** YYYY-MM-DD in the notification zone, for once-per-day dedupe keys. */
export function notifDateKey(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: NOTIF_TZ }).format(date);
}
