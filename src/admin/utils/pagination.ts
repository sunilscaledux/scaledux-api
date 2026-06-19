import { Request } from 'express';

export interface PageParams {
  page: number;
  limit: number;
  skip: number;
  search?: string;
}

/** Parse ?page=&limit=&search= with sane defaults & caps. */
export function getPageParams(req: Request, defaultLimit = 20, maxLimit = 100): PageParams {
  const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
  const rawLimit = parseInt(req.query.limit as string, 10) || defaultLimit;
  const limit = Math.min(maxLimit, Math.max(1, rawLimit));
  const search = typeof req.query.search === 'string' && req.query.search.trim()
    ? req.query.search.trim()
    : undefined;
  return { page, limit, skip: (page - 1) * limit, search };
}

/**
 * Parse ?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD into a Prisma date range
 * (inclusive of the whole `to` day). Returns undefined when neither is set.
 */
export function getDateRange(req: Request): { gte?: Date; lte?: Date } | undefined {
  const fromRaw = typeof req.query.date_from === 'string' ? req.query.date_from.trim() : '';
  const toRaw = typeof req.query.date_to === 'string' ? req.query.date_to.trim() : '';
  if (!fromRaw && !toRaw) return undefined;

  const range: { gte?: Date; lte?: Date } = {};
  if (fromRaw) {
    const d = new Date(fromRaw);
    if (!isNaN(d.getTime())) range.gte = d;
  }
  if (toRaw) {
    const d = new Date(toRaw);
    if (!isNaN(d.getTime())) {
      d.setHours(23, 59, 59, 999); // include the entire end day
      range.lte = d;
    }
  }
  return Object.keys(range).length ? range : undefined;
}

export function buildMeta(total: number, page: number, limit: number) {
  return {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
    hasNext: page * limit < total,
    hasPrev: page > 1,
  };
}

/** Standard paginated payload: { items, meta }. */
export function paginated<T>(items: T[], total: number, page: number, limit: number) {
  return { items, meta: buildMeta(total, page, limit) };
}
