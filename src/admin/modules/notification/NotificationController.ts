import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '@services/prismaService';
import { ApiResponse } from '@utils/ApiResponse';
import { auditFromReq } from '@admin/services/auditService';

function audienceWhere(target: string, role?: string, userIds?: number[]): Prisma.UserWhereInput {
  if (target === 'users') return { id: { in: userIds ?? [] } };
  if (target === 'role') return { role };
  return { status: 1, is_deactivated: false }; // 'all' active users
}

export async function previewAudience(req: Request, res: Response) {
  const { target, role, userIds } = req.body || {};
  if (!target) return ApiResponse.error(res, 'target is required (all | role | users)', null, 400);
  const count = await prisma.user.count({ where: audienceWhere(target, role, userIds) });
  return ApiResponse.success(res, { count }, 'Audience size');
}

export async function sendAnnouncement(req: Request, res: Response) {
  const { title, body, link, target, role, userIds } = req.body || {};
  if (!title) return ApiResponse.error(res, 'title is required', null, 400);
  if (!target) return ApiResponse.error(res, 'target is required (all | role | users)', null, 400);
  if (target === 'role' && !role) return ApiResponse.error(res, 'role is required when target=role', null, 400);
  if (target === 'users' && (!Array.isArray(userIds) || userIds.length === 0)) {
    return ApiResponse.error(res, 'userIds is required when target=users', null, 400);
  }

  const where = audienceWhere(target, role, userIds);
  const recipients = await prisma.user.findMany({ where, select: { id: true } });
  if (recipients.length === 0) return ApiResponse.error(res, 'No recipients matched', null, 400);

  // Insert in batches to keep statements bounded.
  const rows = recipients.map((r) => ({
    user_id: r.id,
    type: 'ADMIN_ANNOUNCEMENT',
    title: String(title).slice(0, 500),
    body: body ? String(body) : null,
    link: link ? String(link).slice(0, 1024) : null,
  }));

  const BATCH = 1000;
  let created = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const res2 = await prisma.notification.createMany({ data: rows.slice(i, i + BATCH) });
    created += res2.count;
  }

  await auditFromReq(req, 'notification.broadcast', {
    entityType: 'Notification',
    description: title,
    metadata: { target, role, recipients: created },
  });
  return ApiResponse.success(res, { recipients: created }, `Announcement sent to ${created} user(s)`);
}
