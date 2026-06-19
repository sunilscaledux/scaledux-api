import { Request, Response } from 'express';
import { AdminAuthService } from './AdminAuthService';
import { ApiResponse } from '@utils/ApiResponse';
import { appConfig } from '@admin/config';
import { auditFromReq } from '@admin/services/auditService';

function baseCookieOpts() {
  return {
    httpOnly: true,
    secure: appConfig.cookie.secure,
    sameSite: appConfig.cookie.sameSite,
    domain: appConfig.cookie.domain,
    path: '/',
  } as const;
}

function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
  res.cookie(appConfig.accessCookieName, accessToken, {
    ...baseCookieOpts(),
    maxAge: appConfig.accessMaxAgeMs,
  });
  res.cookie(appConfig.refreshCookieName, refreshToken, {
    ...baseCookieOpts(),
    maxAge: appConfig.refreshMaxAgeMs,
  });
}

function clearAuthCookies(res: Response) {
  res.clearCookie(appConfig.accessCookieName, { ...baseCookieOpts() });
  res.clearCookie(appConfig.refreshCookieName, { ...baseCookieOpts() });
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return ApiResponse.error(res, 'Email and password are required', null, 400);
  }

  const result = await AdminAuthService.login(email, password, {
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  });

  if (!result.success || !result.data) {
    return ApiResponse.error(res, result.message, null, 401);
  }

  setAuthCookies(res, result.data.accessToken, result.data.refreshToken);
  await auditFromReq({ ...req, admin: { id: result.data.admin.id } } as any, 'auth.login', {
    entityType: 'Admin',
    entityId: result.data.admin.id,
  });
  return ApiResponse.success(res, result.data.admin, result.message);
}

export async function refresh(req: Request, res: Response) {
  const token = req.cookies?.[appConfig.refreshCookieName];
  if (!token) return ApiResponse.unauthorized(res, 'No refresh token');

  const result = await AdminAuthService.refresh(token);
  if (!result.success || !result.data) {
    clearAuthCookies(res);
    return ApiResponse.unauthorized(res, result.message);
  }

  setAuthCookies(res, result.data.accessToken, result.data.refreshToken);
  return ApiResponse.success(res, null, result.message);
}

export async function logout(req: Request, res: Response) {
  const token = req.cookies?.[appConfig.refreshCookieName];
  await AdminAuthService.logout(token);
  if (req.admin) await auditFromReq(req, 'auth.logout');
  clearAuthCookies(res);
  return ApiResponse.success(res, null, 'Logged out');
}

export async function me(req: Request, res: Response) {
  const result = await AdminAuthService.me(req.admin!.id);
  if (!result.success) return ApiResponse.notFound(res, result.message);
  return ApiResponse.success(res, result.data, 'OK');
}

export async function changePassword(req: Request, res: Response) {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) {
    return ApiResponse.error(res, 'Current and new password are required', null, 400);
  }
  if (String(newPassword).length < 8) {
    return ApiResponse.error(res, 'New password must be at least 8 characters', null, 400);
  }

  const result = await AdminAuthService.changePassword(req.admin!.id, currentPassword, newPassword);
  if (!result.success) return ApiResponse.error(res, result.message, null, 400);

  await auditFromReq(req, 'auth.change_password');
  return ApiResponse.success(res, null, result.message);
}
