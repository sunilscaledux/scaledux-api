import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '@services/prismaService';
import { ApiResponse } from '@utils/ApiResponse';
import { getPageParams, paginated, getDateRange } from '@admin/utils/pagination';

export async function listAuditLogs(req: Request, res: Response) {
  const { page, limit, skip } = getPageParams(req);
  const action = req.query.action as string | undefined;
  const entityType = req.query.entity_type as string | undefined;
  const adminId = req.query.admin_id ? parseInt(req.query.admin_id as string, 10) : undefined;

  const where: Prisma.AdminAuditLogWhereInput = {};
  if (action) where.action = { contains: action };
  if (entityType) where.entity_type = entityType;
  if (adminId) where.admin_id = adminId;
  const created = getDateRange(req);
  if (created) where.created_at = created;

  const [rows, total] = await Promise.all([
    prisma.adminAuditLog.findMany({
      where,
      include: { admin: { select: { id: true, name: true, email: true, role: true } } },
      orderBy: { created_at: 'desc' },
      skip,
      take: limit,
    }),
    prisma.adminAuditLog.count({ where }),
  ]);

  return ApiResponse.success(res, paginated(rows, total, page, limit));
}
