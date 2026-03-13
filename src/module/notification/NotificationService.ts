import { prisma } from '@services/prismaService';
import { ServiceResponse } from '@utils/ApiResponse';

export interface NotificationItem {
  id: number;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: Date | null;
  created_at: Date;
}

export class NotificationService {
  static async list(
    userId: number,
    limit: number = 10,
    offset: number = 0
  ): Promise<ServiceResponse<{ list: NotificationItem[]; hasMore: boolean }>> {
    const take = limit + 1;
    const rows = await prisma.notification.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      skip: offset,
      take,
      select: {
        id: true,
        type: true,
        title: true,
        body: true,
        link: true,
        read_at: true,
        created_at: true
      }
    });
    const hasMore = rows.length > limit;
    const list = rows.slice(0, limit);
    return { success: true, message: 'OK', data: { list, hasMore } };
  }

  static async markAsRead(userId: number, id: number): Promise<ServiceResponse<NotificationItem | null>> {
    const n = await prisma.notification.findFirst({
      where: { id, user_id: userId }
    });
    if (!n) return { success: false, message: 'Notification not found' };
    const updated = await prisma.notification.update({
      where: { id },
      data: { read_at: new Date() },
      select: {
        id: true,
        type: true,
        title: true,
        body: true,
        link: true,
        read_at: true,
        created_at: true
      }
    });
    return { success: true, message: 'OK', data: updated };
  }

  static async markAllAsRead(userId: number): Promise<ServiceResponse<{ count: number }>> {
    const result = await prisma.notification.updateMany({
      where: { user_id: userId, read_at: null },
      data: { read_at: new Date() }
    });
    return { success: true, message: 'OK', data: { count: result.count } };
  }

  static async remove(userId: number, id: number): Promise<ServiceResponse<{ id: number }>> {
    const n = await prisma.notification.findFirst({
      where: { id, user_id: userId }
    });
    if (!n) return { success: false, message: 'Notification not found' };
    await prisma.notification.delete({ where: { id } });
    return { success: true, message: 'OK', data: { id } };
  }

  static async getUnreadCount(userId: number): Promise<ServiceResponse<number>> {
    const count = await prisma.notification.count({
      where: { user_id: userId, read_at: null }
    });
    return { success: true, message: 'OK', data: count };
  }
}
