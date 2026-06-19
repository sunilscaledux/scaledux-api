import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '@admin/utils/jwt';
import { ApiResponse } from '@utils/ApiResponse';
import { appConfig } from '@admin/config';
import { prisma } from '@services/prismaService';
import { hasPermission, PermissionKey } from '@admin/constants/permissions';

export interface AuthedAdmin {
  id: number;
  unique_id: string;
  email: string;
  role: string;
  name: string;
  permissions?: unknown;
}

declare global {
  namespace Express {
    interface Request {
      admin?: AuthedAdmin;
    }
  }
}

/**
 * Verify the admin access token cookie, confirm the admin still exists & is
 * active, and attach `req.admin`. Loads permission overrides from the DB.
 */
export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.[appConfig.accessCookieName];
    if (!token) return ApiResponse.unauthorized(res, 'Authentication required');

    const decoded = verifyAccessToken(token);

    const admin = await prisma.admin.findUnique({
      where: { id: decoded.id },
      select: { id: true, unique_id: true, email: true, role: true, name: true, status: true, permissions: true },
    });

    if (!admin) return ApiResponse.unauthorized(res, 'Admin account not found');
    if (admin.status !== 1) return ApiResponse.forbidden(res, 'Admin account is suspended');

    req.admin = {
      id: admin.id,
      unique_id: admin.unique_id,
      email: admin.email,
      role: admin.role,
      name: admin.name,
      permissions: admin.permissions,
    };
    next();
  } catch {
    return ApiResponse.unauthorized(res, 'Invalid or expired token');
  }
}

/** Restrict to specific AdminRole(s). */
export function requireRole(roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.admin) return ApiResponse.unauthorized(res, 'Authentication required');
    if (!roles.includes(req.admin.role)) return ApiResponse.forbidden(res, 'Insufficient role');
    next();
  };
}

/** Restrict to admins holding a given permission key (role default or override). */
export function requirePermission(key: PermissionKey) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.admin) return ApiResponse.unauthorized(res, 'Authentication required');
    if (!hasPermission(req.admin.role, req.admin.permissions, key)) {
      return ApiResponse.forbidden(res, 'You do not have permission to perform this action');
    }
    next();
  };
}
