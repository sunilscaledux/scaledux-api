import { Prisma } from '@prisma/client';
import { prisma } from '@services/prismaService';
import { ServiceResponse } from '@utils/ApiResponse';
import { paginated } from '@admin/utils/pagination';

const STATUSES = ['SUBSCRIBED', 'UNSUBSCRIBED'] as const;
type SubscriberStatus = (typeof STATUSES)[number];

export interface NewsletterListParams {
  page: number;
  limit: number;
  skip: number;
  status?: string;
  role?: string;
  search?: string;
  created?: { gte?: Date; lte?: Date } | undefined;
}

function buildWhere(p: Omit<NewsletterListParams, 'page' | 'limit' | 'skip'>) {
  const where: Prisma.NewsletterSubscriberWhereInput = {};
  if (p.status && STATUSES.includes(p.status as SubscriberStatus)) where.status = p.status;
  if (p.role) where.role = p.role;
  if (p.created) where.created_at = p.created;
  if (p.search) where.email = { contains: p.search.trim(), mode: 'insensitive' };
  return where;
}

export class NewsletterService {
  static async list(p: NewsletterListParams): Promise<ServiceResponse> {
    const where = buildWhere(p);

    const [rows, total, subscribed] = await Promise.all([
      prisma.newsletterSubscriber.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: p.skip,
        take: p.limit,
      }),
      prisma.newsletterSubscriber.count({ where }),
      prisma.newsletterSubscriber.count({ where: { status: 'SUBSCRIBED' } }),
    ]);

    const items = rows.map((r) => ({
      id: r.id,
      unique_id: r.unique_id,
      email: r.email,
      role: r.role,
      status: r.status,
      source: r.source,
      unsubscribed_at: r.unsubscribed_at,
      created_at: r.created_at,
    }));

    return {
      success: true,
      message: 'OK',
      data: { ...paginated(items, total, p.page, p.limit), stats: { subscribed } },
    };
  }

  /** Flat rows for the CSV export — no pagination, same filters as the list. */
  static async listAll(p: Omit<NewsletterListParams, 'page' | 'limit' | 'skip'>) {
    return prisma.newsletterSubscriber.findMany({
      where: buildWhere(p),
      orderBy: { created_at: 'desc' },
      select: { email: true, role: true, status: true, source: true, created_at: true },
    });
  }

  static async update(id: number, body: { status?: unknown }): Promise<ServiceResponse> {
    const existing = await prisma.newsletterSubscriber.findUnique({ where: { id } });
    if (!existing) return { success: false, message: 'Subscriber not found', statusCode: 404 };

    if (body.status === undefined) {
      return { success: false, message: 'Nothing to update', statusCode: 400 };
    }
    const status = String(body.status);
    if (!STATUSES.includes(status as SubscriberStatus)) {
      return { success: false, message: `Status must be one of: ${STATUSES.join(', ')}`, statusCode: 400 };
    }

    const updated = await prisma.newsletterSubscriber.update({
      where: { id },
      data: {
        status,
        unsubscribed_at: status === 'UNSUBSCRIBED' ? new Date() : null,
      },
    });

    return {
      success: true,
      message: `Subscriber marked ${status.toLowerCase()}`,
      data: { id: updated.id, status: updated.status },
    };
  }

  static async remove(id: number): Promise<ServiceResponse> {
    const existing = await prisma.newsletterSubscriber.findUnique({ where: { id } });
    if (!existing) return { success: false, message: 'Subscriber not found', statusCode: 404 };

    await prisma.newsletterSubscriber.delete({ where: { id } });
    return { success: true, message: 'Subscriber deleted', data: { id } };
  }
}
