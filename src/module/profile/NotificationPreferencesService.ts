import { prisma } from '@services/prismaService';
import { ServiceResponse } from '@utils/ApiResponse';
import { getNotificationEmailTypes, isNotificationEmailType, type NotificationEmailType } from '../../constants/notificationTypes';

/** Stored shape: { [NotificationEmailType]: boolean }. true = send, false = do not send. Missing key = send (default). */
export type EmailPreferencesRecord = Partial<Record<NotificationEmailType, boolean>>;

export class NotificationPreferencesService {
  static async getTypes(): Promise<ServiceResponse<Array<{ type: NotificationEmailType; label: string; category: string }>>> {
    const types = getNotificationEmailTypes();
    return { success: true, message: 'OK', data: [...types] };
  }

  static async getPreferences(userId: number): Promise<ServiceResponse<EmailPreferencesRecord>> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email_notification_preferences: true }
    });
    if (!user) {
      return { success: false, message: 'User not found' };
    }
    const raw = user.email_notification_preferences;
    const preferences: EmailPreferencesRecord = typeof raw === 'object' && raw !== null ? { ...(raw as Record<string, boolean>) } : {};
    return { success: true, message: 'OK', data: preferences };
  }

  static async updatePreferences(userId: number, body: Record<string, unknown>): Promise<ServiceResponse<EmailPreferencesRecord>> {
    const preferences: EmailPreferencesRecord = {};
    for (const [key, value] of Object.entries(body)) {
      if (!isNotificationEmailType(key)) continue;
      if (typeof value !== 'boolean') continue;
      preferences[key as NotificationEmailType] = value;
    }
    await prisma.user.update({
      where: { id: userId },
      data: { email_notification_preferences: preferences as object }
    });
    return { success: true, message: 'Preferences updated', data: preferences };
  }
}
