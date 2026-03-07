import { BaseJob, Job } from './BaseJob';
import { prisma } from '../services/prismaService';
import { emailService } from '../services/emailService';
import { NotificationPreferencesService } from '../module/profile/NotificationPreferencesService';
import { templateService } from '../services/templateService';
import { isNotificationEmailType, type NotificationEmailType } from '../constants/notificationTypes';

export interface SendNotificationJobData {
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

@Job()
export class SendNotificationJob extends BaseJob<SendNotificationJobData> {
  async handle(data: SendNotificationJobData): Promise<void> {
    const type = data.type as NotificationEmailType;
    if (!isNotificationEmailType(type)) {
      console.warn(`SendNotificationJob: unknown type "${data.type}", skipping`);
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: data.userId },
      select: { id: true, email: true, first_name: true }
    });
    if (!user) {
      console.warn(`SendNotificationJob: user ${data.userId} not found, skipping`);
      return;
    }

    // 1) Create in-app notification (same title/body as email)
    await prisma.notification.create({
      data: {
        user_id: data.userId,
        type: data.type,
        title: data.notificationTitle,
        body: data.notificationBody ?? null,
        link: data.notificationLink ?? null,
        actor_id: data.actorId ?? null,
        subject_type: data.subjectType ?? null,
        subject_id: data.subjectId ?? null
      }
    });

    // 2) Send email only if user has not opted out (same title = subject, same body = content)
    const shouldSend = await NotificationPreferencesService.shouldSendNotificationEmail(data.userId, type);
    if (!shouldSend || !user.email) {
      if (!shouldSend) console.log(`SendNotificationJob: user ${data.userId} opted out of email for ${type}`);
      return;
    }

    const link = data.notificationLink
      ? (data.notificationLink.startsWith('http') ? data.notificationLink : `${process.env.CLIENT_APP_URL || process.env.APP_URL || ''}${data.notificationLink}`)
      : '#';
    const compiled = await templateService.getCustomTemplate(
      'notification',
      {
        TITLE: data.notificationTitle,
        MESSAGE: data.notificationBody || '',
        LINK: link
      },
      data.notificationTitle,
      true
    );

    await emailService.sendEmail({
      to: user.email,
      subject: data.notificationTitle,
      html: compiled.html
    });
  }
}
