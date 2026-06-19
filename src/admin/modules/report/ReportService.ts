import { prisma } from '@services/prismaService';
import { ServiceResponse } from '@utils/ApiResponse';
import { Prisma } from '@prisma/client';
import { paginated } from '@admin/utils/pagination';
import { userCard, userCardSelect } from '@admin/utils/format';

const STATUSES = ['PENDING', 'REVIEWING', 'RESOLVED', 'CLOSED'];

export interface ReportListParams {
  page: number;
  limit: number;
  skip: number;
  status?: string;
  userId?: string;
  created?: Prisma.DateTimeFilter | undefined;
}

export class ReportService {
  static async list(p: ReportListParams): Promise<ServiceResponse> {
    const where: Record<string, any> = {};
    if (p.status) where.status = p.status;
    if (p.userId) where.reported_user_id = Number(p.userId);
    if (p.created) where.created_at = p.created;

    const [rows, total] = await Promise.all([
      prisma.reportSpam.findMany({
        where,
        include: {
          reporter: { select: userCardSelect },
          reported_user: { select: userCardSelect },
        },
        orderBy: { created_at: 'desc' },
        skip: p.skip,
        take: p.limit,
      }),
      prisma.reportSpam.count({ where }),
    ]);

    const items = rows.map((r) => ({
      id: r.id,
      unique_id: r.unique_id,
      reason: r.reason,
      description: r.description,
      status: r.status,
      created_at: r.created_at,
      reporter: userCard(r.reporter),
      reported_user: userCard(r.reported_user),
    }));
    return { success: true, message: 'OK', data: paginated(items, total, p.page, p.limit) };
  }

  static async updateStatus(id: number, body: { status?: string }): Promise<ServiceResponse> {
    const { status } = body;
    if (!STATUSES.includes(status as string)) {
      return { success: false, message: `status must be one of ${STATUSES.join(', ')}`, statusCode: 400 };
    }

    const r = await prisma.reportSpam.update({ where: { id }, data: { status } });
    return { success: true, message: 'Report status updated', data: { id: r.id, status: r.status } };
  }
}
