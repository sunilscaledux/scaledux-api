import { Request, Response } from 'express';
import { ApiResponse } from '@utils/ApiResponse';
import { auditFromReq } from '@admin/services/auditService';
import { ConstantService } from './ConstantService';

/**
 * Admin management of generic option lists (Constant table).
 * Groups + their sub-lists are admin-managed: add / edit / deactivate / reorder.
 * Consuming records store the option's `value` text, never the row id.
 */

/** List the catalog of groups (for the admin sidebar/picker). */
export async function listGroups(_req: Request, res: Response) {
  const result = await ConstantService.listGroups();
  return ApiResponse.success(res, result.data);
}

/** List entries within a group, optionally filtered by subkey. Includes inactive (admin view). */
export async function listConstants(req: Request, res: Response) {
  const group = String(req.query.group || '');
  const subkey = req.query.subkey != null ? String(req.query.subkey) : undefined;
  const result = await ConstantService.list(group, subkey);
  if (!result.success) return ApiResponse.error(res, result.message, null, result.statusCode ?? 400);
  return ApiResponse.success(res, result.data);
}

export async function createConstant(req: Request, res: Response) {
  const result = await ConstantService.create(req.body || {});
  if (!result.success) return ApiResponse.error(res, result.message, null, result.statusCode ?? 400);
  await auditFromReq(req, 'constant.create', { entityType: 'Constant', entityId: result.data.id });
  return ApiResponse.created(res, result.data, result.message);
}

export async function updateConstant(req: Request, res: Response) {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return ApiResponse.error(res, 'Invalid id', null, 400);
  const result = await ConstantService.update(id, req.body || {});
  if (!result.success) return ApiResponse.error(res, result.message, null, result.statusCode ?? 400);
  await auditFromReq(req, 'constant.update', { entityType: 'Constant', entityId: id });
  return ApiResponse.success(res, result.data, result.message);
}

/** Persist a new ordering for a set of ids (admin drag-to-reorder). */
export async function reorderConstants(req: Request, res: Response) {
  const result = await ConstantService.reorder(req.body?.ids);
  if (!result.success) return ApiResponse.error(res, result.message, null, result.statusCode ?? 400);
  await auditFromReq(req, 'constant.reorder', {
    entityType: 'Constant',
    metadata: { count: result.data.count },
  });
  return ApiResponse.success(res, null, result.message);
}
