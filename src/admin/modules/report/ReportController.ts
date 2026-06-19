import { Request, Response } from 'express';
import { prisma } from '@services/prismaService';
import { ApiResponse } from '@utils/ApiResponse';
import { getPageParams, paginated, getDateRange } from '@admin/utils/pagination';
import { userCard, userCardSelect } from '@admin/utils/format';
import { auditFromReq } from '@admin/services/auditService';

const STATUSES = ['PENDING', 'REVIEWING', 'RESOLVED', 'CLOSED'];

export async function listReports(req: Request, res: Response) {
  const { page, limit, skip } = getPageParams(req);
  const status = req.query.status as string | undefined;
  const where: Record<string, any> = {};
  if (status) where.status = status;
  const created = getDateRange(req);
  if (created) where.created_at = created;

  const [rows, total] = await Promise.all([
    prisma.reportSpam.findMany({
      where,
      include: {
        reporter: { select: userCardSelect },
        reported_user: { select: userCardSelect },
      },
      orderBy: { created_at: 'desc' },
      skip,
      take: limit,
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
  return ApiResponse.success(res, paginated(items, total, page, limit));
}

export async function updateReportStatus(req: Request, res: Response) {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return ApiResponse.error(res, 'Invalid id', null, 400);
  const { status } = req.body || {};
  if (!STATUSES.includes(status)) return ApiResponse.error(res, `status must be one of ${STATUSES.join(', ')}`, null, 400);

  const r = await prisma.reportSpam.update({ where: { id }, data: { status } });
  await auditFromReq(req, 'report.update_status', { entityType: 'ReportSpam', entityId: id, metadata: { status } });
  return ApiResponse.success(res, { id: r.id, status: r.status }, 'Report status updated');
}
