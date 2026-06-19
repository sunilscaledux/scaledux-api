import { appConfig } from '@admin/config';

/**
 * Resolve a stored file path/key into an absolute URL.
 * Mirrors how the main app serves Bunny CDN assets: already-absolute URLs are
 * returned as-is; bare keys are prefixed with the CDN host.
 */
export function resolveFileUrl(path?: string | null): string | null {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  if (!appConfig.cdnHost) return path;
  return `${appConfig.cdnHost}/${path.replace(/^\/+/, '')}`;
}
