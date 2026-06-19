import { Request, Response } from 'express';
import { ApiResponse } from '@utils/ApiResponse';
import { getPageParams, getDateRange } from '@admin/utils/pagination';
import { AuditService } from './AuditService';

export async function listAuditLogs(req: Request, res: Response) {
  const { page, limit, skip } = getPageParams(req);
  const result = await AuditService.list({
    page,
    limit,
    skip,
    action: req.query.action as string | undefined,
    entityType: req.query.entity_type as string | undefined,
    adminId: req.query.admin_id ? parseInt(req.query.admin_id as string, 10) : undefined,
    created: getDateRange(req),
  });
  return ApiResponse.success(res, result.data);
}
