import { prisma } from '@services/prismaService';
import { ServiceResponse } from '@utils/ApiResponse';
import { verifyPassword, hashPassword } from '@admin/utils/password';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  hashToken,
} from '@admin/utils/jwt';
import { resolvePermissions } from '@admin/constants/permissions';
import { appConfig } from '@admin/config';

function publicAdmin(a: any) {
  return {
    id: a.id,
    unique_id: a.unique_id,
    name: a.name,
    email: a.email,
    role: a.role,
    avatar_url: a.avatar_url,
    phone: a.phone,
    status: a.status,
    last_login_at: a.last_login_at,
    permissions: Array.from(resolvePermissions(a.role, a.permissions)),
  };
}

export class AdminAuthService {
  static async login(
    email: string,
    password: string,
    ctx: { ip?: string; userAgent?: string }
  ): Promise<ServiceResponse<{ admin: any; accessToken: string; refreshToken: string }>> {
    const admin = await prisma.admin.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (!admin || !admin.password) {
      return { success: false, message: 'Invalid email or password' };
    }
    if (admin.status !== 1) {
      return { success: false, message: 'Your admin account is suspended' };
    }

    const ok = await verifyPassword(password, admin.password);
    if (!ok) return { success: false, message: 'Invalid email or password' };

    const accessToken = signAccessToken({
      id: admin.id,
      unique_id: admin.unique_id,
      email: admin.email,
      role: admin.role,
      name: admin.name,
    });
    const refreshToken = signRefreshToken({ id: admin.id, unique_id: admin.unique_id });

    await prisma.adminSession.create({
      data: {
        admin_id: admin.id,
        token_hash: hashToken(refreshToken),
        ip_address: ctx.ip ?? null,
        user_agent: ctx.userAgent ?? null,
        expires_at: new Date(Date.now() + appConfig.refreshMaxAgeMs),
      },
    });

    await prisma.admin.update({ where: { id: admin.id }, data: { last_login_at: new Date() } });

    return {
      success: true,
      message: 'Logged in successfully',
      data: { admin: publicAdmin(admin), accessToken, refreshToken },
    };
  }

  static async refresh(
    refreshToken: string
  ): Promise<ServiceResponse<{ accessToken: string; refreshToken: string }>> {
    let payload: { id: number; unique_id: string };
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      return { success: false, message: 'Invalid refresh token' };
    }

    const session = await prisma.adminSession.findUnique({
      where: { token_hash: hashToken(refreshToken) },
    });
    if (!session || session.revoked_at || session.expires_at < new Date()) {
      return { success: false, message: 'Session expired, please log in again' };
    }

    const admin = await prisma.admin.findUnique({ where: { id: payload.id } });
    if (!admin || admin.status !== 1) {
      return { success: false, message: 'Admin account unavailable' };
    }

    const newAccess = signAccessToken({
      id: admin.id,
      unique_id: admin.unique_id,
      email: admin.email,
      role: admin.role,
      name: admin.name,
    });
    const newRefresh = signRefreshToken({ id: admin.id, unique_id: admin.unique_id });

    // Rotate: revoke old session, create new one.
    await prisma.$transaction([
      prisma.adminSession.update({
        where: { id: session.id },
        data: { revoked_at: new Date() },
      }),
      prisma.adminSession.create({
        data: {
          admin_id: admin.id,
          token_hash: hashToken(newRefresh),
          ip_address: session.ip_address,
          user_agent: session.user_agent,
          expires_at: new Date(Date.now() + appConfig.refreshMaxAgeMs),
        },
      }),
    ]);

    return {
      success: true,
      message: 'Token refreshed',
      data: { accessToken: newAccess, refreshToken: newRefresh },
    };
  }

  static async logout(refreshToken?: string): Promise<ServiceResponse> {
    if (refreshToken) {
      await prisma.adminSession.updateMany({
        where: { token_hash: hashToken(refreshToken), revoked_at: null },
        data: { revoked_at: new Date() },
      });
    }
    return { success: true, message: 'Logged out' };
  }

  static async me(adminId: number): Promise<ServiceResponse> {
    const admin = await prisma.admin.findUnique({ where: { id: adminId } });
    if (!admin) return { success: false, message: 'Admin not found' };
    return { success: true, message: 'OK', data: publicAdmin(admin) };
  }

  static async changePassword(
    adminId: number,
    currentPassword: string,
    newPassword: string
  ): Promise<ServiceResponse> {
    const admin = await prisma.admin.findUnique({ where: { id: adminId } });
    if (!admin || !admin.password) return { success: false, message: 'Admin not found' };

    const ok = await verifyPassword(currentPassword, admin.password);
    if (!ok) return { success: false, message: 'Current password is incorrect' };

    await prisma.admin.update({
      where: { id: adminId },
      data: { password: await hashPassword(newPassword) },
    });

    // Invalidate all other sessions for safety.
    await prisma.adminSession.updateMany({
      where: { admin_id: adminId, revoked_at: null },
      data: { revoked_at: new Date() },
    });

    return { success: true, message: 'Password changed successfully' };
  }
}
