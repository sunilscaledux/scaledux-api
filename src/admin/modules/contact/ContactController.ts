import { Request, Response } from 'express';
import { ApiResponse } from '@utils/ApiResponse';
import { getPageParams, getDateRange } from '@admin/utils/pagination';
import { auditFromReq } from '@admin/services/auditService';
import { ContactService } from './ContactService';

export async function listContacts(req: Request, res: Response) {
  const { page, limit, skip } = getPageParams(req);
  const result = await ContactService.list({
    page,
    limit,
    skip,
    status: req.query.status as string | undefined,
    reason: req.query.reason as string | undefined,
    search: req.query.search as string | undefined,
    created: getDateRange(req),
  });
  return ApiResponse.success(res, result.data);
}

export async function getContact(req: Request, res: Response) {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return ApiResponse.error(res, 'Invalid id', null, 400);
  const result = await ContactService.getOne(id);
  if (!result.success) return ApiResponse.notFound(res, result.message);
  return ApiResponse.success(res, result.data);
}

export async function updateContact(req: Request, res: Response) {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return ApiResponse.error(res, 'Invalid id', null, 400);
  const result = await ContactService.update(id, req.body || {});
  if (!result.success) return ApiResponse.error(res, result.message, null, result.statusCode ?? 400);
  await auditFromReq(req, 'contact.update', { entityType: 'ContactSubmission', entityId: id });
  return ApiResponse.success(res, result.data, result.message);
}
