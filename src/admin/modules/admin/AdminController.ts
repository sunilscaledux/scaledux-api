import { Request, Response } from 'express';
import { prisma } from '@services/prismaService';
import { ApiResponse } from '@utils/ApiResponse';
import { hashPassword } from '@admin/utils/password';
import { auditFromReq } from '@admin/services/auditService';
import { ROLE_PERMISSIONS } from '@admin/constants/permissions';

const ROLES = Object.keys(ROLE_PERMISSIONS); // SUPER_ADMIN, ADMIN, MODERATOR, FINANCE, SUPPORT

function publicAdmin(a: any) {
  const { password, ...rest } = a;
  return rest;
}

export async function listAdmins(_req: Request, res: Response) {
  const rows = await prisma.admin.findMany({
    orderBy: { created_at: 'desc' },
    select: {
      id: true, unique_id: true, name: true, email: true, role: true, status: true,
      permissions: true, last_login_at: true, created_at: true, phone: true, avatar_url: true,
    },
  });
  return ApiResponse.success(res, rows);
}

export async function createAdmin(req: Request, res: Response) {
  const { name, email, password, role, permissions } = req.body || {};
  if (!name || !email || !password) return ApiResponse.error(res, 'name, email and password are required', null, 400);
  if (String(password).length < 8) return ApiResponse.error(res, 'Password must be at least 8 characters', null, 400);
  const finalRole = role && ROLES.includes(role) ? role : 'ADMIN';

  const existing = await prisma.admin.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (existing) return ApiResponse.error(res, 'An admin with this email already exists', null, 409);

  const admin = await prisma.admin.create({
    data: {
      name,
      email: email.toLowerCase().trim(),
      password: await hashPassword(password),
      role: finalRole as any,
      permissions: Array.isArray(permissions) ? permissions : undefined,
      created_by: req.admin!.id,
    },
  });
  await auditFromReq(req, 'admin.create', { entityType: 'Admin', entityId: admin.id, metadata: { role: finalRole } });
  return ApiResponse.created(res, publicAdmin(admin), 'Admin created');
}

export async function updateAdmin(req: Request, res: Response) {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return ApiResponse.error(res, 'Invalid id', null, 400);
  const { name, role, status, permissions, phone } = req.body || {};

  if (id === req.admin!.id && (status === 0 || (role && role !== req.admin!.role))) {
    return ApiResponse.error(res, 'You cannot change your own role or suspend yourself', null, 400);
  }
  if (role && !ROLES.includes(role)) return ApiResponse.error(res, 'Invalid role', null, 400);

  const admin = await prisma.admin.update({
    where: { id },
    data: {
      ...(name != null ? { name } : {}),
      ...(phone != null ? { phone } : {}),
      ...(role ? { role: role as any } : {}),
      ...(status === 0 || status === 1 ? { status } : {}),
      ...(permissions !== undefined ? { permissions: Array.isArray(permissions) ? permissions : undefined } : {}),
    },
  });
  await auditFromReq(req, 'admin.update', { entityType: 'Admin', entityId: id });
  return ApiResponse.success(res, publicAdmin(admin), 'Admin updated');
}

export async function resetAdminPassword(req: Request, res: Response) {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return ApiResponse.error(res, 'Invalid id', null, 400);
  const { newPassword } = req.body || {};
  if (!newPassword || String(newPassword).length < 8) {
    return ApiResponse.error(res, 'newPassword must be at least 8 characters', null, 400);
  }

  await prisma.admin.update({ where: { id }, data: { password: await hashPassword(newPassword) } });
  // Force re-login everywhere for that admin.
  await prisma.adminSession.updateMany({ where: { admin_id: id, revoked_at: null }, data: { revoked_at: new Date() } });
  await auditFromReq(req, 'admin.reset_password', { entityType: 'Admin', entityId: id });
  return ApiResponse.success(res, null, 'Password reset');
}

export async function deleteAdmin(req: Request, res: Response) {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return ApiResponse.error(res, 'Invalid id', null, 400);
  if (id === req.admin!.id) return ApiResponse.error(res, 'You cannot delete your own account', null, 400);

  await prisma.admin.delete({ where: { id } });
  await auditFromReq(req, 'admin.delete', { entityType: 'Admin', entityId: id });
  return ApiResponse.success(res, null, 'Admin deleted');
}
