import { Prisma } from '@prisma/client';
import { prisma } from '@services/prismaService';
import { ServiceResponse } from '@utils/ApiResponse';

function audienceWhere(target: string, role?: string, userIds?: number[]): Prisma.UserWhereInput {
  if (target === 'users') return { id: { in: userIds ?? [] } };
  if (target === 'role') return { role };
  return { status: 1, is_deactivated: false }; // 'all' active users
}

export class NotificationService {
  static async previewAudience(body: {
    target?: unknown;
    role?: unknown;
    userIds?: unknown;
  }): Promise<ServiceResponse> {
    const { target, role, userIds } = body;
    if (!target)
      return { success: false, message: 'target is required (all | role | users)', statusCode: 400 };
    const count = await prisma.user.count({
      where: audienceWhere(target as string, role as string | undefined, userIds as number[] | undefined),
    });
    return { success: true, message: 'Audience size', data: { count } };
  }

  static async sendAnnouncement(body: {
    title?: unknown;
    body?: unknown;
    link?: unknown;
    target?: unknown;
    role?: unknown;
    userIds?: unknown;
  }): Promise<ServiceResponse> {
    const { title, body: messageBody, link, target, role, userIds } = body;
    if (!title) return { success: false, message: 'title is required', statusCode: 400 };
    if (!target)
      return { success: false, message: 'target is required (all | role | users)', statusCode: 400 };
    if (target === 'role' && !role)
      return { success: false, message: 'role is required when target=role', statusCode: 400 };
    if (target === 'users' && (!Array.isArray(userIds) || userIds.length === 0)) {
      return { success: false, message: 'userIds is required when target=users', statusCode: 400 };
    }

    const where = audienceWhere(target as string, role as string | undefined, userIds as number[] | undefined);
    const recipients = await prisma.user.findMany({ where, select: { id: true } });
    if (recipients.length === 0)
      return { success: false, message: 'No recipients matched', statusCode: 400 };

    // Insert in batches to keep statements bounded.
    const rows = recipients.map((r) => ({
      user_id: r.id,
      type: 'ADMIN_ANNOUNCEMENT',
      title: String(title).slice(0, 500),
      body: messageBody ? String(messageBody) : null,
      link: link ? String(link).slice(0, 1024) : null,
    }));

    const BATCH = 1000;
    let created = 0;
    for (let i = 0; i < rows.length; i += BATCH) {
      const res2 = await prisma.notification.createMany({ data: rows.slice(i, i + BATCH) });
      created += res2.count;
    }

    return {
      success: true,
      message: `Announcement sent to ${created} user(s)`,
      data: { recipients: created },
    };
  }
}
