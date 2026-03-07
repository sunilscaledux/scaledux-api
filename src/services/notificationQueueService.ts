import { dispatch } from '../queues/Queue';
import { SendNotificationJob, type SendNotificationJobData } from '../jobs/SendNotificationJob';
import type { NotificationEmailType } from '../constants/notificationTypes';

export interface QueueNotificationInput {
  userId: number;
  type: NotificationEmailType;
  title: string;
  body?: string | null;
  link?: string | null;
  emailSubject?: string | null;
  emailHtml?: string | null;
  template?: string | null;
  templateVars?: Record<string, string | number | boolean> | null;
  actorId?: number | null;
  subjectType?: string | null;
  subjectId?: number | null;
}

/**
 * Central entry: enqueue a notification job. The worker will create the in-app notification
 * and send email only if the user has not opted out for this type.
 */
export async function queueNotification(input: QueueNotificationInput): Promise<void> {
  const data: SendNotificationJobData = {
    userId: input.userId,
    type: input.type,
    title: input.title,
    body: input.body ?? null,
    link: input.link ?? null,
    emailSubject: input.emailSubject ?? null,
    emailHtml: input.emailHtml ?? null,
    template: input.template ?? null,
    templateVars: input.templateVars ?? null,
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
