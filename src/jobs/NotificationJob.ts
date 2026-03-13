import { BaseJob } from './BaseJob';
import { prisma } from '../services/prismaService';
import { Log } from '@services/loggerService';
import { isNotificationEmailType, type NotificationEmailType } from '../constants/notificationTypes';
import type { NotificationJobPayload } from './types';

export class NotificationJob extends BaseJob<NotificationJobPayload> {
  async handle(data: NotificationJobPayload): Promise<void> {
    const type = data.type as NotificationEmailType;
    if (!isNotificationEmailType(type)) {
      Log.warn(`NotificationJob: unknown type "${data.type}", skipping`);
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: data.userId },
      select: { id: true }
    });
    if (!user) {
      Log.warn(`NotificationJob: user ${data.userId} not found, skipping`);
      return;
    }

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
  }
}
