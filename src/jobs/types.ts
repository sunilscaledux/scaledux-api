/**
 * Shared payload for notification-related jobs (in-app notification and email).
 * Used by NotificationJob and NotificationEmailJob.
 */
export interface NotificationJobPayload {
  userId: number;
  type: string; // NotificationEmailType
  /** Same title for in-app notification and email subject */
  notificationTitle: string;
  /** HTML body used for email; also used for in-app if inAppBody is not set */
  notificationBody?: string | null;
  /** Plain-text or simple HTML body for in-app notifications (overrides notificationBody) */
  inAppBody?: string | null;
  notificationLink?: string | null;
  actorId?: number | null;
  subjectType?: string | null;
  subjectId?: number | null;
}
