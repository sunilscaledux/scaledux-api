import { Request, Response } from 'express';
import { ApiResponse } from '@utils/ApiResponse';
import { getPageParams, getDateRange } from '@admin/utils/pagination';
import { auditFromReq } from '@admin/services/auditService';
import { VerificationService } from './VerificationService';

export async function listIdentity(req: Request, res: Response) {
  const { page, limit, skip } = getPageParams(req);
  const result = await VerificationService.listIdentity({
    page,
    limit,
    skip,
    status: (req.query.status as string) || undefined,
    created: getDateRange(req),
  });
  return ApiResponse.success(res, result.data);
}

export async function reviewIdentity(req: Request, res: Response) {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return ApiResponse.error(res, 'Invalid id', null, 400);
  const result = await VerificationService.reviewIdentity(id, req.body || {});
  if (!result.success) {
    if (result.statusCode === 404) return ApiResponse.notFound(res, result.message);
    return ApiResponse.error(res, result.message, null, result.statusCode ?? 400);
  }
  const { status, rejection_reason } = req.body || {};
  await auditFromReq(req, `verification.identity.${status.toLowerCase()}`, {
    entityType: 'IdentityVerification',
    entityId: id,
    description: rejection_reason,
  });
  return ApiResponse.success(res, result.data, result.message);
}

export async function listAgency(req: Request, res: Response) {
  const { page, limit, skip } = getPageParams(req);
  const result = await VerificationService.listAgency({
    page,
    limit,
    skip,
    status: (req.query.status as string) || undefined,
    created: getDateRange(req),
  });
  return ApiResponse.success(res, result.data);
}

export async function reviewAgency(req: Request, res: Response) {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return ApiResponse.error(res, 'Invalid id', null, 400);
  const result = await VerificationService.reviewAgency(id, req.body || {}, req.admin!.id);
  if (!result.success) {
    if (result.statusCode === 404) return ApiResponse.notFound(res, result.message);
    return ApiResponse.error(res, result.message, null, result.statusCode ?? 400);
  }
  const { status, rejection_reason } = req.body || {};
  await auditFromReq(req, `verification.agency.${status.toLowerCase()}`, {
    entityType: 'AgencyVerification',
    entityId: id,
    description: rejection_reason,
  });
  return ApiResponse.success(res, result.data, result.message);
}
