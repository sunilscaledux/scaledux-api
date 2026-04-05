import cuid from 'cuid';
import { prisma } from '@services/prismaService';
import { getPublicUrl, getPrivateFileAndSend } from '@services/bunnyStorageService';
import { isPublicField } from '@config/filePolicy';

const ASSET_URL = process.env.APP_URL || process.env.ASSET_URL || 'http://127.0.0.1:4000';

/** Check if value is a valid attachment unique_id (cuid). */
export function isAttachmentId(value: string | null): boolean {
  if (!value || typeof value !== 'string') return false;
  return value.length >= 20 && value.length <= 32 && /^c[a-z0-9]+$/i.test(value);
}

/** Extract attachment unique_id from a raw value (plain id or URL containing one). */
export function urlOrPathToAttachmentId(value: string | null | undefined): string | null {
  if (value == null || typeof value !== 'string') return null;
  const s = value.trim().replace(/\?.*$/, '');
  if (!s) return null;
  if (isAttachmentId(s)) return s;
  const segments = s.split('/').filter(Boolean);
  for (let i = segments.length - 1; i >= 0; i--) {
    const raw = segments[i];
    if (!raw) continue;
    const id = raw.replace(/\.[^.]+$/, '');
    if (isAttachmentId(id)) return id;
  }
  return null;
}

/** Extract attachment unique_ids from an array. Skips null/invalid. Preserves order. */
export function urlsOrPathsToAttachmentIds(values: (string | null | undefined)[] | null | undefined): string[] {
  if (values == null || !Array.isArray(values)) return [];
  const ids: string[] = [];
  for (const v of values) {
    const id = urlOrPathToAttachmentId(v);
    if (id) ids.push(id);
  }
  return ids;
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


export async function resolveAttachmentUrl(
  value: string | null,
  fieldName: string = 'attachment'
): Promise<string> {
  if (!value) return '';
  const baseUrl = (process.env.APP_URL || ASSET_URL).replace(/\/$/, '');

  const att = await getByUniqueId(value);
  if (!att) {
    return '';
  }

  const allowed = att.visibility === 'public' && isPublicField(fieldName);

  if (allowed) {
    return getPublicUrl(att.path);
  }

  return buildPrivateUrl(baseUrl, att.unique_id, att.original_name);
}

/**
 * Resolve array of attachment unique_ids to URLs. Preserves order. Non-attachment values become ''.
 */
export async function resolveAttachmentUrls(
  values: (string | null)[],
  fieldName: string = 'attachment'
): Promise<string[]> {
  if (!values?.length) return [];
  const ids = values.filter((v): v is string => !!v && isAttachmentId(v));
  const uniqueIds = [...new Set(ids)];
  if (uniqueIds.length === 0) {
    return values.map(() => '');
  }
  type AttUrlRow = { unique_id: string; visibility: string; path: string; original_name: string | null };
  const attachments = await prisma.attachment.findMany({
    where: { unique_id: { in: uniqueIds }, deleted_at: null },
    select: { unique_id: true, visibility: true, path: true, original_name: true },
  });
  const map = new Map<string, AttUrlRow>(
    (attachments as AttUrlRow[]).map((a) => [a.unique_id, a])
  );
  const baseUrl = (process.env.APP_URL || ASSET_URL).replace(/\/$/, '');

  return values.map((v) => {
    if (!v) return '';
    const att = map.get(v);
    if (!att) return '';
    const allowed = att.visibility === 'public' && isPublicField(fieldName);
    if (allowed) {
      return getPublicUrl(att.path);
    }
    return buildPrivateUrl(baseUrl, att.unique_id, att.original_name);
  }).filter(Boolean);
}

function buildPrivateUrl(baseUrl: string, uniqueId: string, originalName: string | null): string {
  if (!originalName) return `${baseUrl}/files/view/${uniqueId}`;
  return `${baseUrl}/files/view/${uniqueId}?f=${encodeURIComponent(originalName)}`;
}

/**
 * Mark attachments as 'attached', grant access to additional user IDs, and restore soft-deleted files.
 */
export async function markAttachmentsAttached(
  attachmentIds: string[],
  grantAccessToUserIds: number[]
): Promise<void> {
  if (!attachmentIds.length) return;
  for (const uid of attachmentIds) {
    // Find even soft-deleted files — if we're attaching them, they should be restored
    const att = await prisma.attachment.findUnique({ where: { unique_id: uid } });
    if (!att) continue;
    const existing = Array.isArray(att.accessible_user_ids) ? (att.accessible_user_ids as number[]) : [];
    const merged = [...new Set([...existing, ...grantAccessToUserIds])];
    await prisma.attachment.update({
      where: { id: att.id },
      data: { status: 'attached', accessible_user_ids: merged, deleted_at: null },
    });
  }
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
