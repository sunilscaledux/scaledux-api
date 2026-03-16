import { BaseJob } from './BaseJob';
import { prisma } from '../services/prismaService';
import { emailService } from '@services/emailService';
import { Log } from '@services/loggerService';
import { NotificationPreferencesService } from '../module/profile/NotificationPreferencesService';
import { templateService } from '../services/templateService';
import { isNotificationEmailType, type NotificationEmailType } from '../constants/notificationTypes';
import type { NotificationJobPayload } from './types';

export class NotificationEmailJob extends BaseJob<NotificationJobPayload> {
  async handle(data: NotificationJobPayload): Promise<void> {
    const type = data.type as NotificationEmailType;
    if (!isNotificationEmailType(type)) {
      Log.warn(`SendNotificationEmailJob: unknown type "${data.type}", skipping`);
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: data.userId },
      select: { id: true, email: true, first_name: true }
    });
    if (!user) {
      Log.warn(`SendNotificationEmailJob: user ${data.userId} not found, skipping`);
      return;
    }

    const shouldSend = await NotificationPreferencesService.shouldSendNotificationEmail(data.userId, type);
    if (!shouldSend || !user.email) {
      if (!shouldSend) Log.info(`SendNotificationEmailJob: user ${data.userId} opted out of email for ${type}`);
      return;
    }

    const link = data.notificationLink
      ? (data.notificationLink.startsWith('http') ? data.notificationLink : `${process.env.FRONTEND_URL || process.env.APP_URL || ''}${data.notificationLink}`)
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
