/**
 * Shared payload for notification-related jobs (in-app notification and email).
 * Used by CreateNotificationJob and SendNotificationEmailJob.
 */
export interface NotificationJobPayload {
  userId: number;
  type: string; // NotificationEmailType
  /** Same title for in-app notification and email subject */
  notificationTitle: string;
  /** Same body for in-app notification and email content */
  notificationBody?: string | null;
  notificationLink?: string | null;
  actorId?: number | null;
  subjectType?: string | null;
  subjectId?: number | null;
}
