import { BaseJob } from './BaseJob';
import { appConfig } from '@config/app';
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
      ? (data.notificationLink.startsWith('http') ? data.notificationLink : `${appConfig.frontendUrl}${data.notificationLink}`)
      : '';
    const ctaButton = link
      ? `<p><a href="${link}" style="display:inline-block;padding:10px 24px;background-color:#667eea;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600;">View Details</a></p>`
      : '';
    const compiled = await templateService.getCustomTemplate(
      'notification',
      {
        TITLE: data.notificationTitle,
        MESSAGE: data.notificationBody || '',
        CTA_BUTTON: ctaButton
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
