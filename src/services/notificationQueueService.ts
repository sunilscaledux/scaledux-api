import { dispatch } from '../queues/Queue';
import { SendNotificationJob, type SendNotificationJobData } from '../jobs/SendNotificationJob';
import type { NotificationEmailType } from '../constants/notificationTypes';

export interface QueueNotificationInput {
  userId: number;
  type: NotificationEmailType;
  /** Same title used for in-app notification and email subject */
  notificationTitle: string;
  /** Same body text used for in-app notification and email content */
  notificationBody?: string | null;
  /** Link for "View details" in notification and email */
  notificationLink?: string | null;
  actorId?: number | null;
  subjectType?: string | null;
  subjectId?: number | null;
}

/**
 * Central entry: enqueue a notification job. The worker will create the in-app notification
 * and send email only if the user has not opted out. Same notificationTitle and notificationBody
 * are used for both in-app notification and email.
 */
export async function queueNotification(input: QueueNotificationInput): Promise<void> {
  const data: SendNotificationJobData = {
    userId: input.userId,
    type: input.type,
    notificationTitle: input.notificationTitle,
    notificationBody: input.notificationBody ?? null,
    notificationLink: input.notificationLink ?? null,
    actorId: input.actorId ?? null,
    subjectType: input.subjectType ?? null,
    subjectId: input.subjectId ?? null
  };
  try {
    await dispatch(SendNotificationJob, data, { jobId: undefined });
  } catch (err) {
    console.error('notificationQueueService.queueNotification failed:', err);
    throw err;
  }
}
