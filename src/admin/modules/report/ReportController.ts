import { Request, Response } from 'express';
import { ApiResponse } from '@utils/ApiResponse';
import { getPageParams, getDateRange } from '@admin/utils/pagination';
import { auditFromReq } from '@admin/services/auditService';
import { ReportService } from './ReportService';

export async function listReports(req: Request, res: Response) {
  const { page, limit, skip } = getPageParams(req);
  const result = await ReportService.list({
    page,
    limit,
    skip,
    status: req.query.status as string | undefined,
    userId: req.query.userId as string | undefined,
    created: getDateRange(req),
  });
  return ApiResponse.success(res, result.data);
}

export async function updateReportStatus(req: Request, res: Response) {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return ApiResponse.error(res, 'Invalid id', null, 400);
  const result = await ReportService.updateStatus(id, req.body || {});
  if (!result.success) {
    if (result.statusCode === 404) return ApiResponse.notFound(res, result.message);
    return ApiResponse.error(res, result.message, null, result.statusCode ?? 400);
  }
  await auditFromReq(req, 'report.update_status', {
    entityType: 'ReportSpam',
    entityId: id,
    metadata: { status: result.data.status },
  });
  return ApiResponse.success(res, result.data, result.message);
}
