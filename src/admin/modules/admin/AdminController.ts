import { Request, Response } from 'express';
import { ApiResponse } from '@utils/ApiResponse';
import { auditFromReq } from '@admin/services/auditService';
import { AdminService } from './AdminService';

export async function listAdmins(_req: Request, res: Response) {
  const result = await AdminService.list();
  return ApiResponse.success(res, result.data);
}

export async function createAdmin(req: Request, res: Response) {
  const result = await AdminService.create(req.body || {}, req.admin!.id);
  if (!result.success) return ApiResponse.error(res, result.message, null, result.statusCode ?? 400);
  await auditFromReq(req, 'admin.create', {
    entityType: 'Admin',
    entityId: result.data.id,
    metadata: { role: result.data.role },
  });
  return ApiResponse.created(res, result.data, result.message);
}

export async function updateAdmin(req: Request, res: Response) {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return ApiResponse.error(res, 'Invalid id', null, 400);
  const result = await AdminService.update(id, req.body || {}, req.admin!.id, req.admin!.role);
  if (!result.success) return ApiResponse.error(res, result.message, null, result.statusCode ?? 400);
  await auditFromReq(req, 'admin.update', { entityType: 'Admin', entityId: id });
  return ApiResponse.success(res, result.data, result.message);
}

export async function resetAdminPassword(req: Request, res: Response) {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return ApiResponse.error(res, 'Invalid id', null, 400);
  const result = await AdminService.resetPassword(id, (req.body || {}).newPassword);
  if (!result.success) return ApiResponse.error(res, result.message, null, result.statusCode ?? 400);
  await auditFromReq(req, 'admin.reset_password', { entityType: 'Admin', entityId: id });
  return ApiResponse.success(res, null, result.message);
}

export async function deleteAdmin(req: Request, res: Response) {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return ApiResponse.error(res, 'Invalid id', null, 400);
  const result = await AdminService.remove(id, req.admin!.id);
  if (!result.success) return ApiResponse.error(res, result.message, null, result.statusCode ?? 400);
  await auditFromReq(req, 'admin.delete', { entityType: 'Admin', entityId: id });
  return ApiResponse.success(res, null, result.message);
}
