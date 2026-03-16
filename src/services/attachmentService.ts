import cuid from 'cuid';
import { prisma } from '@services/prismaService';
import { getPublicUrl, getPrivateFileAndSend } from '@services/bunnyStorageService';
import { isPublicField } from '@config/filePolicy';

const ASSET_URL = process.env.APP_URL || process.env.ASSET_URL || 'http://127.0.0.1:4000';

/** Heuristic: is this value an attachment unique_id (cuid) or legacy path? */
export function isAttachmentId(value: string | null): boolean {
  if (!value || typeof value !== 'string') return false;
  if (value.includes('/') || value.includes('uploads') || value.startsWith('http')) return false;
  return value.length >= 20 && value.length <= 32 && /^c[a-z0-9]+$/i.test(value);
}

/** Generate opaque storage path: attachments/{unique_id}{ext} */
export function opaqueStoragePath(uniqueId: string, ext?: string): string {
  const suffix = ext && !ext.startsWith('.') ? `.${ext}` : ext || '';
  return `attachments/${uniqueId}${suffix}`;
}

export type CreateAttachmentInput = {
  ownerUserId: number;
  uploadedByUserId: number;
  path: string;
  disk: 'local' | 'bunny';
  visibility: 'public' | 'private';
  mimeType?: string | null;
  sizeBytes?: number | null;
  originalName?: string | null;
  status?: 'temporary' | 'attached';
  existingUniqueId?: string;
  accessibleUserIds?: number[] | null;
};

export async function createAttachment(input: CreateAttachmentInput): Promise<{ unique_id: string } | null> {
  const uniqueId = input.existingUniqueId ?? cuid();
  const status = input.status ?? 'temporary';
  try {
    await prisma.attachment.create({
      data: {
        unique_id: uniqueId,
        owner_user_id: input.ownerUserId,
        uploaded_by_user_id: input.uploadedByUserId,
        path: input.path,
        disk: input.disk,
        visibility: input.visibility,
        mime_type: input.mimeType ?? null,
        size_bytes: input.sizeBytes ?? null,
        original_name: input.originalName ?? null,
        status,
        accessible_user_ids: input.accessibleUserIds ?? undefined,
      },
    });
    return { unique_id: uniqueId };
  } catch {
    return null;
  }
}

export async function getByUniqueId(uniqueId: string) {
  return prisma.attachment.findUnique({
    where: { unique_id: uniqueId, deleted_at: null },
  });
}

/**
 * Resolve attachment unique_id to a URL for API response.
 * If value is not an attachment id, returns '' (no legacy path resolution).
 * baseUrl: e.g. process.env.APP_URL for protected URL.
 */
export async function resolveAttachmentUrl(
  value: string | null,
  options?: { entityType?: string; fieldName?: string; baseUrl?: string }
): Promise<string> {
  if (!value) return '';
  const baseUrl = (options?.baseUrl || process.env.APP_URL || ASSET_URL).replace(/\/$/, '');

  const att = await getByUniqueId(value);
  if (!att) return '';

  const fieldName = options?.fieldName ?? 'attachment';
  const allowed = att.visibility === 'public' && isPublicField(fieldName);

  if (allowed) {
    return getPublicUrl(att.path);
  }

  return `${baseUrl}/api/v1/files/view/${att.unique_id}`;
}

/**
 * Resolve array of attachment unique_ids to URLs. Preserves order. Non-attachment values become ''.
 */
export async function resolveAttachmentUrls(
  values: (string | null)[],
  options?: { entityType?: string; fieldName?: string; baseUrl?: string }
): Promise<string[]> {
  if (!values?.length) return [];
  const ids = values.filter((v): v is string => !!v && isAttachmentId(v));
  const uniqueIds = [...new Set(ids)];
  if (uniqueIds.length === 0) {
    return values.map(() => '');
  }
  const attachments = await prisma.attachment.findMany({
    where: { unique_id: { in: uniqueIds }, deleted_at: null },
  });
  const map = new Map(attachments.map((a) => [a.unique_id, a]));
  const baseUrl = (options?.baseUrl || process.env.APP_URL || ASSET_URL).replace(/\/$/, '');
  const fieldName = options?.fieldName ?? 'attachment';

  return values.map((v) => {
    if (!v) return '';
    const att = map.get(v);
    if (!att) return '';
    const allowed = att.visibility === 'public' && isPublicField(fieldName);
    if (allowed) {
      return getPublicUrl(att.path);
    }
    return `${baseUrl}/api/v1/files/view/${att.unique_id}`;
  });
}

/**
 * Check access and stream private file. Returns true if response was sent.
 */
export async function viewProtectedFile(
  uniqueId: string,
  checkAccess: () => Promise<boolean>,
  res: import('express').Response
): Promise<boolean> {
  const att = await getByUniqueId(uniqueId);
  if (!att) return false;
  const allowed = await checkAccess();
  if (!allowed) return false;
  return getPrivateFileAndSend(att.path, () => Promise.resolve(true), res);
}
