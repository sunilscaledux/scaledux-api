import { Notification } from './NotificationModel';
import { ServiceResponse } from '@utils/ApiResponse';

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: Date | null;
  created_at: Date;
}

function toItem(doc: { _id: any; type: string; title: string; body: string | null; link: string | null; readAt: Date | null; createdAt: Date }): NotificationItem {
  return {
    id: String(doc._id),
    type: doc.type,
    title: doc.title,
    body: doc.body ?? null,
    link: doc.link ?? null,
    read_at: doc.readAt ?? null,
    created_at: doc.createdAt
  };
}

export class NotificationService {
  static async list(
    userId: number,
    limit: number = 10,
    offset: number = 0
  ): Promise<ServiceResponse<{ list: NotificationItem[]; hasMore: boolean }>> {
    const take = limit + 1;
    const rows = await Notification.find({ userId })
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(take)
      .lean();
    const hasMore = rows.length > limit;
    const list = rows.slice(0, limit).map((r: any) => toItem(r));
    return { success: true, message: 'OK', data: { list, hasMore } };
  }

  static async markAsRead(userId: number, id: string): Promise<ServiceResponse<NotificationItem | null>> {
    const n = await Notification.findOne({ _id: id, userId });
    if (!n) return { success: false, message: 'Notification not found' };
    n.readAt = new Date();
    await n.save();
    return { success: true, message: 'OK', data: toItem(n) };
  }

  static async markAllAsRead(userId: number): Promise<ServiceResponse<{ count: number }>> {
    const result = await Notification.updateMany(
      { userId, readAt: null },
      { $set: { readAt: new Date() } }
    );
    return { success: true, message: 'OK', data: { count: result.modifiedCount } };
  }

  static async remove(userId: number, id: string): Promise<ServiceResponse<{ id: string }>> {
    const n = await Notification.findOne({ _id: id, userId });
    if (!n) return { success: false, message: 'Notification not found' };
    await Notification.deleteOne({ _id: id });
    return { success: true, message: 'OK', data: { id } };
  }

  static async getUnreadCount(userId: number): Promise<ServiceResponse<number>> {
    const count = await Notification.countDocuments({ userId, readAt: null });
    return { success: true, message: 'OK', data: count };
  }
}
