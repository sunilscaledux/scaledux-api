import { dispatch } from '../queues/Queue';
import { CreateNotificationJob } from '../jobs/NotificationJob';
import { SendNotificationEmailJob } from '../jobs/EmailNotificationJob';
import type { NotificationJobPayload } from '../jobs/types';
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
 * Central entry: enqueue notification and email jobs. The in-app notification is always created
 * (CreateNotificationJob). Email is sent only when the user has not opted out (SendNotificationEmailJob).
 * Same notificationTitle and notificationBody are used for both.
 */
export async function queueNotification(input: QueueNotificationInput): Promise<void> {
  const data: NotificationJobPayload = {
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
    await dispatch(CreateNotificationJob, data, { jobId: undefined });
    await dispatch(SendNotificationEmailJob, data, { jobId: undefined });
  } catch (err) {
    console.error('notificationQueueService.queueNotification failed:', err);
    throw err;
  }
}
