/** Admin API config derived from env. Runs in the same app as the main API. */

const cdnHost = (process.env.BUNNY_CDN_HOSTNAME || process.env.ASSET_URL || '').replace(/\/$/, '');
const cookieSecure = process.env.ADMIN_COOKIE_SECURE === 'true';
const cookieDomain = (process.env.ADMIN_COOKIE_DOMAIN || '').trim() || undefined;

export const appConfig = {
  appName: 'ScaleDux Admin',
  appEnv: process.env.NODE_ENV || 'local',
  port: parseInt(process.env.ADMIN_PORT || '4002', 10),
  cdnHost,
  /** Public base URL of the admin API (as reached by the browser), used to build
   *  absolute file-streaming URLs for attachments. Override in prod via ADMIN_PUBLIC_URL. */
  publicApiUrl: (process.env.ADMIN_PUBLIC_URL || 'http://localhost:4002/api/admin/v1').replace(/\/$/, ''),
  cookie: {
    secure: cookieSecure,
    domain: cookieDomain,
    sameSite: (cookieSecure ? 'none' : 'lax') as 'none' | 'lax',
  },
  accessCookieName: 'admin_token',
  refreshCookieName: 'admin_refresh_token',
  /** Access token cookie maxAge (ms): 1 day. */
  accessMaxAgeMs: 24 * 60 * 60 * 1000,
  /** Refresh token cookie maxAge (ms): 30 days. */
  refreshMaxAgeMs: 30 * 24 * 60 * 60 * 1000,
};
