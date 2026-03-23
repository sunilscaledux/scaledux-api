import { prisma } from '@services/prismaService';
import { Log } from '@services/loggerService';

const FRONTEND_URL = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');

/**
 * Create a redirect link for an external URL.
 * Returns the ScaleDux redirect URL: {FRONTEND_URL}/r/{code}
 * If a redirect already exists for the same entity + target_url, reuses it.
 */
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
      if (existing) return `${FRONTEND_URL}/r/${existing.code}`;
    }

    const link = await prisma.redirectLink.create({
      data: {
        target_url: normalizedUrl,
        entity_type: options?.entityType,
        entity_id: options?.entityId,
        created_by: options?.createdBy
      }
    });

    return `${FRONTEND_URL}/r/${link.code}`;
  } catch (error) {
    Log.error('Failed to create redirect link', { error });
    return targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`;
  }
}

/**
 * Create redirect links for an array of URLs (e.g., references).
 * Returns array of ScaleDux redirect URLs in same order.
 */
export async function createRedirectLinks(
  urls: string[],
  options?: { entityType?: string; entityId?: number; createdBy?: number }
): Promise<string[]> {
  if (!urls?.length) return [];
  return Promise.all(
    urls.map((url) => (url ? createRedirectLink(url, options) : Promise.resolve('')))
  );
}

/**
 * Resolve a redirect code to its target URL and increment click count.
 */
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

/**
 * Delete redirect links for an entity (e.g., when portfolio is deleted).
 */
export async function deleteRedirectLinksForEntity(entityType: string, entityId: number): Promise<void> {
  try {
    await prisma.redirectLink.deleteMany({
      where: { entity_type: entityType, entity_id: entityId }
    });
  } catch (error) {
    Log.error('Failed to delete redirect links', { error });
  }
}
