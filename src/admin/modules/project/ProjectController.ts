import { Request, Response } from 'express';
import { ApiResponse } from '@utils/ApiResponse';
import { getPageParams, getDateRange } from '@admin/utils/pagination';
import { auditFromReq } from '@admin/services/auditService';
import { ProjectService } from './ProjectService';

export async function listProjects(req: Request, res: Response) {
  const { page, limit, skip, search } = getPageParams(req);
  const result = await ProjectService.list({
    page,
    limit,
    skip,
    search,
    status: req.query.status as string | undefined,
    userId: req.query.userId as string | undefined,
    created: getDateRange(req),
  });
  return ApiResponse.success(res, result.data);
}

export async function getProject(req: Request, res: Response) {
  const { uniqueId } = req.params;
  const result = await ProjectService.getOne(uniqueId);
  if (!result.success) return ApiResponse.notFound(res, result.message);
  return ApiResponse.success(res, result.data);
}

export async function updateProjectStatus(req: Request, res: Response) {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return ApiResponse.error(res, 'Invalid id', null, 400);
  const { status } = req.body || {};
  const result = await ProjectService.updateStatus(id, status);
  if (!result.success) return ApiResponse.error(res, result.message, null, result.statusCode ?? 400);
  await auditFromReq(req, 'project.update_status', { entityType: 'FounderProject', entityId: id, metadata: { status } });
  return ApiResponse.success(res, result.data, result.message);
}

export async function takedownProject(req: Request, res: Response) {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return ApiResponse.error(res, 'Invalid id', null, 400);
  const { reason } = req.body || {};
  const result = await ProjectService.takedown(id);
  if (!result.success) return ApiResponse.error(res, result.message, null, result.statusCode ?? 400);
  await auditFromReq(req, 'project.takedown', { entityType: 'FounderProject', entityId: id, description: reason });
  return ApiResponse.success(res, null, result.message);
}

export async function restoreProject(req: Request, res: Response) {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return ApiResponse.error(res, 'Invalid id', null, 400);
  const result = await ProjectService.restore(id);
  if (!result.success) return ApiResponse.error(res, result.message, null, result.statusCode ?? 400);
  await auditFromReq(req, 'project.restore', { entityType: 'FounderProject', entityId: id });
  return ApiResponse.success(res, null, result.message);
}
