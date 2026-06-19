import { Request, Response } from 'express';
import { ApiResponse } from '@utils/ApiResponse';
import { getPageParams, getDateRange } from '@admin/utils/pagination';
import { auditFromReq } from '@admin/services/auditService';
import { UserService } from './UserService';

export async function listUsers(req: Request, res: Response) {
  const { page, limit, skip, search } = getPageParams(req);
  const result = await UserService.list({
    page,
    limit,
    skip,
    search,
    role: req.query.role as string | undefined,
    status: req.query.status as string | undefined,
    verification: req.query.verification as string | undefined, // identity status
    created: getDateRange(req),
  });
  return ApiResponse.success(res, result.data);
}

export async function getUser(req: Request, res: Response) {
  const { uniqueId } = req.params;
  const result = await UserService.getOne(uniqueId);
  if (!result.success) return ApiResponse.notFound(res, result.message);
  return ApiResponse.success(res, result.data);
}

export async function updateStatus(req: Request, res: Response) {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return ApiResponse.error(res, 'Invalid user id', null, 400);

  const { status } = req.body || {};
  const result = await UserService.updateStatus(id, status);
  if (!result.success) return ApiResponse.error(res, result.message, null, result.statusCode ?? 400);

  await auditFromReq(req, status === 1 ? 'user.activate' : 'user.suspend', {
    entityType: 'User',
    entityId: id,
  });
  return ApiResponse.success(res, result.data, result.message);
}

export async function setDeactivation(req: Request, res: Response) {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return ApiResponse.error(res, 'Invalid user id', null, 400);

  const { deactivate, reason } = req.body || {};
  const result = await UserService.setDeactivation(id, deactivate, reason);
  if (!result.success) return ApiResponse.error(res, result.message, null, result.statusCode ?? 400);

  await auditFromReq(req, deactivate ? 'user.deactivate' : 'user.reactivate', {
    entityType: 'User',
    entityId: id,
    description: reason,
  });
  return ApiResponse.success(res, result.data, result.message);
}

export async function updateRole(req: Request, res: Response) {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return ApiResponse.error(res, 'Invalid user id', null, 400);

  const { role } = req.body || {};
  const result = await UserService.updateRole(id, role);
  if (!result.success) return ApiResponse.error(res, result.message, null, result.statusCode ?? 400);

  await auditFromReq(req, 'user.update_role', { entityType: 'User', entityId: id, metadata: { role } });
  return ApiResponse.success(res, result.data, result.message);
}

export async function impersonate(req: Request, res: Response) {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return ApiResponse.error(res, 'Invalid user id', null, 400);

  const result = await UserService.impersonate(id);
  if (!result.success) {
    if (result.statusCode === 404) return ApiResponse.notFound(res, result.message);
    return ApiResponse.error(res, result.message, null, result.statusCode ?? 400);
  }

  await auditFromReq(req, 'user.impersonate', { entityType: 'User', entityId: id });
  return ApiResponse.success(res, result.data, result.message);
}

/** A user's billing transactions (as payer or receiver) + earnings/wallet summary. */
export async function getUserTransactions(req: Request, res: Response) {
  const { uniqueId } = req.params;
  const { page, limit, skip } = getPageParams(req);
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  const creditsOnly = req.query.creditsOnly === 'true';

  const result = await UserService.getTransactions({
    uniqueId,
    page,
    limit,
    skip,
    search,
    creditsOnly,
    created: getDateRange(req),
  });
  if (!result.success) return ApiResponse.notFound(res, result.message);
  return ApiResponse.success(res, result.data);
}
