import { BaseJob, Job } from './BaseJob';
import { prisma } from '../services/prismaService';
import { emailService } from '../services/emailService';
import { NotificationPreferencesService } from '../module/profile/NotificationPreferencesService';
import { templateService } from '../services/templateService';
import { isNotificationEmailType, type NotificationEmailType } from '../constants/notificationTypes';

export interface SendNotificationJobData {
  userId: number;
  type: string; // NotificationEmailType
  title: string;
  body?: string | null;
  link?: string | null;
  /** Email subject (used when sending email) */
  emailSubject?: string | null;
  /** Pre-rendered HTML for email (if not set, template + templateVars used) */
  emailHtml?: string | null;
  /** Template name (e.g. 'notification' or 'project-invitation') */
  template?: string | null;
  /** Variables for template (e.g. FIRST_NAME, MESSAGE, LINK) */
  templateVars?: Record<string, string | number | boolean> | null;
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

    // 1) Create in-app notification
    await prisma.notification.create({
      data: {
        user_id: data.userId,
        type: data.type,
        title: data.title,
        body: data.body ?? null,
        link: data.link ?? null,
        actor_id: data.actorId ?? null,
        subject_type: data.subjectType ?? null,
        subject_id: data.subjectId ?? null
      }
    });

    // 2) Send email only if user has not opted out
    const shouldSend = await NotificationPreferencesService.shouldSendNotificationEmail(data.userId, type);
    if (!shouldSend || !user.email) {
      if (!shouldSend) console.log(`SendNotificationJob: user ${data.userId} opted out of email for ${type}`);
      return;
    }

    let html: string | undefined;
    if (data.emailHtml) {
      html = data.emailHtml;
    } else if (data.template) {
      const vars = data.templateVars ?? {};
      if (!vars.FIRST_NAME && user.first_name) vars.FIRST_NAME = user.first_name;
      if (!vars.MESSAGE && data.body) vars.MESSAGE = data.body;
      if (!vars.LINK && data.link) vars.LINK = data.link.startsWith('http') ? data.link : `${process.env.APP_URL || ''}${data.link}`;
      if (!vars.TITLE && data.title) vars.TITLE = data.title;
      const compiled = await templateService.getCustomTemplate(
        data.template,
        vars as Record<string, string | number | boolean>,
        data.emailSubject || data.title,
        true
      );
      html = compiled.html;
    } else {
      const link = data.link ? (data.link.startsWith('http') ? data.link : `${process.env.APP_URL || ''}${data.link}`) : '#';
      const compiled = await templateService.getCustomTemplate(
        'notification',
        {
          FIRST_NAME: user.first_name || 'there',
          TITLE: data.title,
          MESSAGE: data.body || '',
          LINK: link
        },
        data.emailSubject || data.title,
        true
      );
      html = compiled.html;
    }

    const subject = data.emailSubject || data.title;
    await emailService.sendEmail({
      to: user.email,
      subject,
      html
    });
  }
}
