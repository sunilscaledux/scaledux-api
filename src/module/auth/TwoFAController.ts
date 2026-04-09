import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Prisma } from '@prisma/client';
import { prisma } from '@services/prismaService';
import { ApiResponse } from '@utils/ApiResponse';
import { generateBackupCodes } from '@utils/General';
import { generateTokenAndSetCookie, generateRefreshToken, getRefreshCookieOptions } from '@utils/jwtUtils';
import { generateAndSendOtp, verifyOtpByType, OTP_TYPES, createLoginDevice } from './AuthService';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';
const SALT_ROUNDS = 10;

// ─── Helper: verify user password ────────────────────────────────────────────

async function verifyPassword(userId: number, password: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { password: true },
  });
  if (!user?.password) return false;
  return bcrypt.compare(password, user.password);
}

// ─── Helper: issue session (same as login flow) ─────────────────────────────

async function issueSession(res: Response, req: Request, userId: number, rememberMe: boolean, trustDevice: boolean = false) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('User not found');

  const { token, cookieOptions, expiresIn } = generateTokenAndSetCookie(user, rememberMe, req);
  res.cookie('auth_token', token, cookieOptions);

  const { token: refreshToken, expiresAt: rfExpiry } = generateRefreshToken(rememberMe);
  res.cookie('refresh_token', refreshToken, getRefreshCookieOptions(rfExpiry, req));

  await createLoginDevice(
    user.id,
    refreshToken,
    rfExpiry,
    req.ip,
    req.headers['user-agent'] as string,
    rememberMe
  );

  // Mark device as trusted if requested
  if (trustDevice) {
    await prisma.loginDevice.updateMany({
      where: { user_id: user.id, refresh_token: refreshToken },
      data: { is_trusted: true },
    });
  }

  return {
    user: {
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      phone: user.phone,
      role: user.role,
    },
    token,
    authenticated: true,
    expiresIn,
    rememberMe,
  };
}

// ─── GET /auth/2fa/status ────────────────────────────────────────────────────

export async function get2FAStatus(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) return ApiResponse.error(res, 'User not authenticated', null, 401);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { two_fa_enabled: true, two_fa_method: true, backup_codes: true },
  });

  const backupCodes = Array.isArray(user?.backup_codes) ? user.backup_codes : [];

  return ApiResponse.success(res, {
    enabled: user?.two_fa_enabled || false,
    method: user?.two_fa_method || null,
    backupCodesRemaining: backupCodes.length,
  });
}

// ─── POST /auth/2fa/enable ───────────────────────────────────────────────────

export async function enable2FA(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) return ApiResponse.error(res, 'User not authenticated', null, 401);

  const { method, password } = req.body;
  if (!password) return ApiResponse.error(res, 'Password is required');
  if (!method || !['email', 'sms'].includes(method)) {
    return ApiResponse.error(res, 'Method must be "email" or "sms"');
  }

  const valid = await verifyPassword(userId, password);
  if (!valid) return ApiResponse.error(res, 'Incorrect password');

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, phone: true, phone_verified_at: true, two_fa_enabled: true },
  });

  if (user?.two_fa_enabled) {
    return ApiResponse.error(res, 'Two-factor authentication is already enabled');
  }

  if (method === 'sms' && (!user?.phone || !user.phone_verified_at)) {
    return ApiResponse.error(res, 'Please verify your phone number before enabling SMS 2FA');
  }

  // Send OTP to verify the channel works
  const otpResult = await generateAndSendOtp({
    email: method === 'email' ? user?.email : null,
    phone: method === 'sms' ? user?.phone : null,
    otpType: OTP_TYPES.TWO_FA_VERIFICATION,
    userId,
  });

  if (!otpResult.success) {
    return ApiResponse.error(res, otpResult.message);
  }

  return ApiResponse.success(res, { method }, 'Verification code sent. Please confirm to enable 2FA.');
}

// ─── POST /auth/2fa/enable/confirm ───────────────────────────────────────────

export async function confirm2FA(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) return ApiResponse.error(res, 'User not authenticated', null, 401);

  const { otp, method } = req.body;
  if (!otp) return ApiResponse.error(res, 'OTP is required');
  if (!method || !['email', 'sms'].includes(method)) {
    return ApiResponse.error(res, 'Method must be "email" or "sms"');
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, phone: true },
  });

  const identifier = method === 'email' ? user?.email : user?.phone;
  if (!identifier) return ApiResponse.error(res, 'Contact method not available');

  const otpResult = await verifyOtpByType(identifier, otp, OTP_TYPES.TWO_FA_VERIFICATION);
  if (!otpResult.success) {
    return ApiResponse.error(res, otpResult.message);
  }

  // Generate backup codes
  const plainCodes = generateBackupCodes(8);
  const hashedCodes = await Promise.all(
    plainCodes.map((code) => bcrypt.hash(code, SALT_ROUNDS))
  );

  await prisma.user.update({
    where: { id: userId },
    data: {
      two_fa_enabled: true,
      two_fa_method: method,
      backup_codes: hashedCodes,
    },
  });

  return ApiResponse.success(res, {
    enabled: true,
    method,
    backupCodes: plainCodes,
  }, 'Two-factor authentication enabled. Save your backup codes securely.');
}

// ─── POST /auth/2fa/disable ──────────────────────────────────────────────────

export async function disable2FA(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) return ApiResponse.error(res, 'User not authenticated', null, 401);

  const { password } = req.body;
  if (!password) return ApiResponse.error(res, 'Password is required');

  const valid = await verifyPassword(userId, password);
  if (!valid) return ApiResponse.error(res, 'Incorrect password');

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { two_fa_enabled: true },
  });

  if (!user?.two_fa_enabled) {
    return ApiResponse.error(res, 'Two-factor authentication is not enabled');
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      two_fa_enabled: false,
      two_fa_method: null,
      backup_codes: Prisma.JsonNull,
    },
  });

  return ApiResponse.success(res, { enabled: false }, 'Two-factor authentication disabled.');
}

// ─── POST /auth/2fa/regenerate-backup-codes ──────────────────────────────────

export async function regenerateBackupCodes(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) return ApiResponse.error(res, 'User not authenticated', null, 401);

  const { password } = req.body;
  if (!password) return ApiResponse.error(res, 'Password is required');

  const valid = await verifyPassword(userId, password);
  if (!valid) return ApiResponse.error(res, 'Incorrect password');

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { two_fa_enabled: true },
  });

  if (!user?.two_fa_enabled) {
    return ApiResponse.error(res, 'Two-factor authentication is not enabled');
  }

  const plainCodes = generateBackupCodes(8);
  const hashedCodes = await Promise.all(
    plainCodes.map((code) => bcrypt.hash(code, SALT_ROUNDS))
  );

  await prisma.user.update({
    where: { id: userId },
    data: { backup_codes: hashedCodes },
  });

  return ApiResponse.success(res, { backupCodes: plainCodes }, 'New backup codes generated. Save them securely.');
}

// ─── POST /auth/2fa/verify (login flow) ──────────────────────────────────────

export async function verify2FA(req: Request, res: Response) {
  const { twoFAToken, otp, trustDevice = false } = req.body;
  if (!twoFAToken || !otp) {
    return ApiResponse.error(res, 'Token and OTP are required');
  }

  let payload: any;
  try {
    payload = jwt.verify(twoFAToken, JWT_SECRET);
  } catch {
    return ApiResponse.error(res, 'Invalid or expired 2FA token. Please log in again.', null, 401);
  }

  if (payload.purpose !== '2fa') {
    return ApiResponse.error(res, 'Invalid token', null, 401);
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, email: true, phone: true, two_fa_method: true },
  });

  if (!user) return ApiResponse.error(res, 'User not found', null, 401);

  const identifier = user.two_fa_method === 'email' ? user.email : user.phone;
  if (!identifier) return ApiResponse.error(res, 'Contact method not available', null, 401);

  const otpResult = await verifyOtpByType(identifier, otp, OTP_TYPES.TWO_FA_VERIFICATION);
  if (!otpResult.success) {
    return ApiResponse.error(res, otpResult.message, null, 401);
  }

  const sessionData = await issueSession(res, req, user.id, payload.rememberMe || false, !!trustDevice);
  return ApiResponse.success(res, sessionData, 'Login successful');
}

// ─── POST /auth/2fa/verify-backup (login flow) ──────────────────────────────

export async function verify2FABackup(req: Request, res: Response) {
  const { twoFAToken, backupCode, trustDevice = false } = req.body;
  if (!twoFAToken || !backupCode) {
    return ApiResponse.error(res, 'Token and backup code are required');
  }

  let payload: any;
  try {
    payload = jwt.verify(twoFAToken, JWT_SECRET);
  } catch {
    return ApiResponse.error(res, 'Invalid or expired 2FA token. Please log in again.', null, 401);
  }

  if (payload.purpose !== '2fa') {
    return ApiResponse.error(res, 'Invalid token', null, 401);
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, backup_codes: true },
  });

  if (!user) return ApiResponse.error(res, 'User not found', null, 401);

  const storedCodes = Array.isArray(user.backup_codes) ? (user.backup_codes as string[]) : [];
  let matchIndex = -1;

  for (let i = 0; i < storedCodes.length; i++) {
    const isMatch = await bcrypt.compare(backupCode.trim(), storedCodes[i]);
    if (isMatch) {
      matchIndex = i;
      break;
    }
  }

  if (matchIndex === -1) {
    return ApiResponse.error(res, 'Invalid backup code', null, 401);
  }

  // Remove used backup code
  const remaining = [...storedCodes];
  remaining.splice(matchIndex, 1);

  await prisma.user.update({
    where: { id: user.id },
    data: { backup_codes: remaining },
  });

  const sessionData = await issueSession(res, req, user.id, payload.rememberMe || false, !!trustDevice);
  return ApiResponse.success(res, sessionData, 'Login successful');
}

// ─── POST /auth/2fa/send-otp (for disable flow — send OTP before disabling) ─

export async function send2FAOtp(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) return ApiResponse.error(res, 'User not authenticated', null, 401);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, phone: true, two_fa_enabled: true, two_fa_method: true },
  });

  if (!user?.two_fa_enabled) {
    return ApiResponse.error(res, 'Two-factor authentication is not enabled');
  }

  const otpResult = await generateAndSendOtp({
    email: user.two_fa_method === 'email' ? user.email : null,
    phone: user.two_fa_method === 'sms' ? user.phone : null,
    otpType: OTP_TYPES.TWO_FA_VERIFICATION,
    userId,
  });

  if (!otpResult.success) {
    return ApiResponse.error(res, otpResult.message);
  }

  return ApiResponse.success(res, null, 'Verification code sent.');
}
