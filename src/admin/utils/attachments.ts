import { prisma } from '@services/prismaService';
import { getPublicUrl } from '@services/bunnyStorageService';
import { urlOrPathToAttachmentId } from '@services/attachmentService';
import { appConfig } from '@admin/config';
import { resolveFileUrl } from './url';

/**
 * Admin-side file resolution. A stored value can be an Attachment unique_id, a
 * bare storage key, or an already-absolute URL. Public attachments resolve to a
 * CDN URL; private ones resolve to the admin streaming endpoint `files/view/:id`
 * (relative to the admin API base — the UI prefixes it). Admins can view ALL
 * private files, so no per-user access check is applied here or at the endpoint.
 */
export interface AdminFile {
  url: string;
  name: string | null;
  type: string | null;
}

async function toFile(value: string | null | undefined): Promise<AdminFile | null> {
  if (!value || typeof value !== 'string') return null;

  const attId = urlOrPathToAttachmentId(value);
  if (attId) {
    const att = await prisma.attachment
      .findUnique({
        where: { unique_id: attId },
        select: { unique_id: true, visibility: true, path: true, original_name: true, mime_type: true },
      })
      .catch(() => null);
    if (att) {
      const url =
        att.visibility === 'public'
          ? getPublicUrl(att.path)
          : `${appConfig.publicApiUrl}/files/view/${att.unique_id}`;
      return { url, name: att.original_name, type: att.mime_type };
    }
  }

  if (/^https?:\/\//i.test(value)) return { url: value, name: null, type: null };

  const resolved = resolveFileUrl(value);
  return resolved ? { url: resolved, name: null, type: null } : null;
}

/** Resolve a single value to an {url,name,type} file, or null. */
export function resolveAdminFile(value: string | null | undefined): Promise<AdminFile | null> {
  return toFile(value);
}

/** Resolve an array (or JSON array) of values to files, dropping unresolvable ones. */
export async function resolveAdminFiles(values: unknown): Promise<AdminFile[]> {
  if (!Array.isArray(values)) return [];
  const out = await Promise.all(values.map((v) => toFile(typeof v === 'string' ? v : (v as any)?.url ?? (v as any)?.path ?? null)));
  return out.filter((f): f is AdminFile => !!f);
}

/** Convenience: resolve a single value to just its URL string (or null). */
export async function resolveAdminUrl(value: string | null | undefined): Promise<string | null> {
  const f = await toFile(value);
  return f?.url ?? null;
}
