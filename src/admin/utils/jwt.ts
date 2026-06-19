import jwt, { SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';

const ACCESS_SECRET = process.env.JWT_ADMIN_SECRET || 'fallback-admin-access-secret';
const REFRESH_SECRET = process.env.JWT_ADMIN_REFRESH_SECRET || 'fallback-admin-refresh-secret';
const ACCESS_TTL = process.env.ACCESS_TOKEN_TTL || '1d';
const REFRESH_TTL = process.env.REFRESH_TOKEN_TTL || '30d';

export interface AdminTokenPayload {
  id: number;
  unique_id: string;
  email: string;
  role: string;
  name: string;
}

export function signAccessToken(payload: AdminTokenPayload): string {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_TTL } as SignOptions);
}

export function signRefreshToken(payload: { id: number; unique_id: string }): string {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_TTL } as SignOptions);
}

export function verifyAccessToken(token: string): AdminTokenPayload {
  return jwt.verify(token, ACCESS_SECRET) as AdminTokenPayload;
}

export function verifyRefreshToken(token: string): { id: number; unique_id: string } {
  return jwt.verify(token, REFRESH_SECRET) as { id: number; unique_id: string };
}

/** sha256 hash of a token — what we persist in scd_admin_sessions.token_hash. */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
