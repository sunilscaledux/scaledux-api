import { Prisma } from '@prisma/client';
import { prisma } from '@services/prismaService';
import { ServiceResponse } from '@utils/ApiResponse';
import { paginated } from '@admin/utils/pagination';

export interface AuditListParams {
  page: number;
  limit: number;
  skip: number;
  action?: string;
  entityType?: string;
  adminId?: number;
  created?: Prisma.DateTimeFilter | undefined;
}

export class AuditService {
  static async list(p: AuditListParams): Promise<ServiceResponse> {
    const where: Prisma.AdminAuditLogWhereInput = {};
    if (p.action) where.action = { contains: p.action };
    if (p.entityType) where.entity_type = p.entityType;
    if (p.adminId) where.admin_id = p.adminId;
    if (p.created) where.created_at = p.created;

    const [rows, total] = await Promise.all([
      prisma.adminAuditLog.findMany({
        where,
        include: { admin: { select: { id: true, name: true, email: true, role: true } } },
        orderBy: { created_at: 'desc' },
        skip: p.skip,
        take: p.limit,
      }),
      prisma.adminAuditLog.count({ where }),
    ]);

    return { success: true, message: 'OK', data: paginated(rows, total, p.page, p.limit) };
  }
}
