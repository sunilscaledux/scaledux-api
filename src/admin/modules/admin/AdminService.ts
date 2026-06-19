import { prisma } from '@services/prismaService';
import { ServiceResponse } from '@utils/ApiResponse';
import { hashPassword } from '@admin/utils/password';
import { ROLE_PERMISSIONS } from '@admin/constants/permissions';

const ROLES = Object.keys(ROLE_PERMISSIONS); // SUPER_ADMIN, ADMIN, MODERATOR, FINANCE, SUPPORT

function publicAdmin(a: any) {
  const { password, ...rest } = a;
  return rest;
}

export interface CreateAdminBody {
  name?: unknown;
  email?: unknown;
  password?: unknown;
  role?: unknown;
  permissions?: unknown;
}

export interface UpdateAdminBody {
  name?: unknown;
  role?: unknown;
  status?: unknown;
  permissions?: unknown;
  phone?: unknown;
}

export class AdminService {
  static async list(): Promise<ServiceResponse> {
    const rows = await prisma.admin.findMany({
      orderBy: { created_at: 'desc' },
      select: {
        id: true, unique_id: true, name: true, email: true, role: true, status: true,
        permissions: true, last_login_at: true, created_at: true, phone: true, avatar_url: true,
      },
    });
    return { success: true, message: 'OK', data: rows };
  }

  static async create(body: CreateAdminBody, actorId: number): Promise<ServiceResponse> {
    const { name, email, password, role, permissions } = body || {};
    if (!name || !email || !password) {
      return { success: false, message: 'name, email and password are required', statusCode: 400 };
    }
    if (String(password).length < 8) {
      return { success: false, message: 'Password must be at least 8 characters', statusCode: 400 };
    }
    const finalRole = role && ROLES.includes(role as string) ? (role as string) : 'ADMIN';

    const existing = await prisma.admin.findUnique({ where: { email: String(email).toLowerCase().trim() } });
    if (existing) {
      return { success: false, message: 'An admin with this email already exists', statusCode: 409 };
    }

    const admin = await prisma.admin.create({
      data: {
        name: name as string,
        email: String(email).toLowerCase().trim(),
        password: await hashPassword(password as string),
        role: finalRole as any,
        permissions: Array.isArray(permissions) ? permissions : undefined,
        created_by: actorId,
      },
    });
    return { success: true, message: 'Admin created', statusCode: 201, data: publicAdmin(admin) };
  }

  static async update(
    id: number,
    body: UpdateAdminBody,
    actorId: number,
    actorRole: string
  ): Promise<ServiceResponse> {
    const { name, role, status, permissions, phone } = body || {};

    if (id === actorId && (status === 0 || (role && role !== actorRole))) {
      return { success: false, message: 'You cannot change your own role or suspend yourself', statusCode: 400 };
    }
    if (role && !ROLES.includes(role as string)) {
      return { success: false, message: 'Invalid role', statusCode: 400 };
    }

    const admin = await prisma.admin.update({
      where: { id },
      data: {
        ...(name != null ? { name: name as string } : {}),
        ...(phone != null ? { phone: phone as string } : {}),
        ...(role ? { role: role as any } : {}),
        ...(status === 0 || status === 1 ? { status: status as number } : {}),
        ...(permissions !== undefined ? { permissions: Array.isArray(permissions) ? permissions : undefined } : {}),
      },
    });
    return { success: true, message: 'Admin updated', data: publicAdmin(admin) };
  }

  static async resetPassword(id: number, newPassword: unknown): Promise<ServiceResponse> {
    if (!newPassword || String(newPassword).length < 8) {
      return { success: false, message: 'newPassword must be at least 8 characters', statusCode: 400 };
    }

    await prisma.admin.update({ where: { id }, data: { password: await hashPassword(newPassword as string) } });
    // Force re-login everywhere for that admin.
    await prisma.adminSession.updateMany({ where: { admin_id: id, revoked_at: null }, data: { revoked_at: new Date() } });
    return { success: true, message: 'Password reset' };
  }

  static async remove(id: number, actorId: number): Promise<ServiceResponse> {
    if (id === actorId) {
      return { success: false, message: 'You cannot delete your own account', statusCode: 400 };
    }

    await prisma.admin.delete({ where: { id } });
    return { success: true, message: 'Admin deleted' };
  }
}
