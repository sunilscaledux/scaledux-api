import crypto from 'crypto';
import { prisma } from '@services/prismaService';
import { Log } from '@services/loggerService';

const FRONTEND_URL = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');

/** Generate a short 6-8 char alphanumeric code */
function shortId(len: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = crypto.randomBytes(len);
  return Array.from(bytes).map(b => chars[b % chars.length]).join('');
}

function generateCode(): string {
  return shortId(7); // e.g. "kQ3xB9m"
}

/** Build the full redirect path: /r/{code}/redirect?t={token}&ref=sd */
function buildRedirectPath(code: string): string {
  const token = shortId(6);
  return `/r/${code}/redirect?t=${token}&ref=sd`;
}

export async function createRedirectLink(
  targetUrl: string,
  options?: { entityType?: string; entityId?: number; createdBy?: number }
): Promise<string> {
  try {
    if (!targetUrl) return '';

    // Normalize URL — ensure it has a protocol
    const normalizedUrl = targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`;

    // Check if redirect already exists for this entity + URL
    if (options?.entityType && options?.entityId) {
      const existing = await prisma.redirectLink.findFirst({
        where: {
          target_url: normalizedUrl,
          entity_type: options.entityType,
          entity_id: options.entityId
        }
      });
      if (existing) return `${FRONTEND_URL}${buildRedirectPath(existing.code)}`;
    }

    const link = await prisma.redirectLink.create({
      data: {
        code: generateCode(),
        target_url: normalizedUrl,
        entity_type: options?.entityType,
        entity_id: options?.entityId,
        created_by: options?.createdBy
      }
    });

    return `${FRONTEND_URL}${buildRedirectPath(link.code)}`;
  } catch (error) {
    Log.error('Failed to create redirect link', { error });
    return targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`;
  }
}


export async function createRedirectLinks(
  urls: string[],
  options?: { entityType?: string; entityId?: number; createdBy?: number }
): Promise<string[]> {
  if (!urls?.length) return [];
  return Promise.all(
    urls.map((url) => (url ? createRedirectLink(url, options) : Promise.resolve('')))
  );
}


export async function resolveRedirectLink(code: string): Promise<string | null> {
  try {
    const link = await prisma.redirectLink.findUnique({
      where: { code }
    });
    if (!link) return null;

    // Increment click count (fire and forget)
    prisma.redirectLink.update({
      where: { id: link.id },
      data: { click_count: { increment: 1 } }
    }).catch(() => {});

    return link.target_url;
  } catch (error) {
    Log.error('Failed to resolve redirect link', { error });
    return null;
  }
}

export async function deleteRedirectLinksForEntity(entityType: string, entityId: number): Promise<void> {
  try {
    await prisma.redirectLink.deleteMany({
      where: { entity_type: entityType, entity_id: entityId }
    });
  } catch (error) {
    Log.error('Failed to delete redirect links', { error });
  }
}
