import jwt from "jsonwebtoken";
import crypto from "crypto";
import { Log } from '@services/loggerService';

/**
 * Parent domain for auth cookies so they're sent to all subdomains
 * (e.g. staging.scaledux.com AND socket.scaledux.com).
 * Set COOKIE_DOMAIN=.scaledux.com in production .env.
 * Leave unset for local dev (cookie scoped to current host).
 */
const COOKIE_DOMAIN: string | undefined = process.env.COOKIE_DOMAIN?.trim() || undefined;

/** Shared base options for auth/refresh cookies. */
export function baseCookieOptions() {
  return {
    httpOnly: true,
    secure: true,
    sameSite: "none" as "none" | "lax" | "strict",
    path: "/",
    domain: COOKIE_DOMAIN,
  };
}

export function generateTokenAndSetCookie(
  user: any,
  rememberMe: boolean = false
) {
  const tokenExpiry = rememberMe ? "7d" : "24h";
  const cookieMaxAge = rememberMe
    ? 7 * 24 * 60 * 60 * 1000
    : 24 * 60 * 60 * 1000;

  const token = jwt.sign(
    {
      id: user.id,
      unique_id: user.unique_id || user.id,
      email: user.email,
      phone: user.phone,
      rememberMe: rememberMe,
      role: user.role ?? undefined,
      profile_type: user.profile_type ?? undefined,
    },
    process.env.JWT_SECRET || "fallback-secret",
    { expiresIn: tokenExpiry }
  );

  const cookieOptions = {
    ...baseCookieOptions(),
    maxAge: cookieMaxAge,
  };

  Log.info(
    `🍪 Token generated with ${rememberMe ? "7 days" : "24 hours"} expiry`
  );

  return { token, cookieOptions, expiresIn: tokenExpiry };
}

/** Generate an opaque refresh token and its DB expiry date */
export function generateRefreshToken(rememberMe: boolean = false): {
  token: string;
  expiresAt: Date;
} {
  const token = crypto.randomBytes(64).toString("hex");
  const days = rememberMe ? 30 : 7;
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  return { token, expiresAt };
}

/** Refresh cookie options (long-lived, httpOnly) */
export function getRefreshCookieOptions(expiresAt: Date) {
  return {
    ...baseCookieOptions(),
    expires: expiresAt,
  };
}
