import { BaseJob, Job } from './BaseJob';
import { prisma } from '../services/prismaService';
import { Log } from '@services/loggerService';
import { isNotificationEmailType, type NotificationEmailType } from '../constants/notificationTypes';
import type { NotificationJobPayload } from './types';
import { Notification } from '../module/notification/NotificationModel';

@Job()
export class CreateNotificationJob extends BaseJob<NotificationJobPayload> {
  async handle(data: NotificationJobPayload): Promise<void> {
    const type = data.type as NotificationEmailType;
    if (!isNotificationEmailType(type)) {
      Log.warn(`CreateNotificationJob: unknown type "${data.type}", skipping`);
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: data.userId },
      select: { id: true }
    });
    if (!user) {
      Log.warn(`CreateNotificationJob: user ${data.userId} not found, skipping`);
      return;
    }

    await Notification.create({
      userId: data.userId,
      type: data.type,
      title: data.notificationTitle,
      body: data.notificationBody ?? null,
      link: data.notificationLink ?? null,
      actorId: data.actorId ?? null,
      subjectType: data.subjectType ?? null,
      subjectId: data.subjectId ?? null
    });
  }
}
