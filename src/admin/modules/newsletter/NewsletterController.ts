import { Request, Response } from 'express';
import { ApiResponse } from '@utils/ApiResponse';
import { getPageParams, getDateRange } from '@admin/utils/pagination';
import { auditFromReq } from '@admin/services/auditService';
import { NewsletterService } from './NewsletterService';

function filtersFromReq(req: Request) {
  return {
    status: req.query.status as string | undefined,
    role: req.query.role as string | undefined,
    search: req.query.search as string | undefined,
    created: getDateRange(req),
  };
}

export async function listSubscribers(req: Request, res: Response) {
  const { page, limit, skip } = getPageParams(req);
  const result = await NewsletterService.list({ page, limit, skip, ...filtersFromReq(req) });
  return ApiResponse.success(res, result.data);
}

export async function exportSubscribers(req: Request, res: Response) {
  const rows = await NewsletterService.listAll(filtersFromReq(req));

  const escape = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [
    'email,role,status,source,subscribed_at',
    ...rows.map((r) =>
      [r.email, r.role, r.status, r.source, r.created_at.toISOString()].map(escape).join(',')
    ),
  ].join('\n');

  await auditFromReq(req, 'newsletter.export', { entityType: 'NewsletterSubscriber' });

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="newsletter-subscribers.csv"');
  return res.send(csv);
}

export async function updateSubscriber(req: Request, res: Response) {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return ApiResponse.error(res, 'Invalid id', null, 400);
  const result = await NewsletterService.update(id, req.body || {});
  if (!result.success) return ApiResponse.error(res, result.message, null, result.statusCode ?? 400);
  await auditFromReq(req, 'newsletter.update', { entityType: 'NewsletterSubscriber', entityId: id });
  return ApiResponse.success(res, result.data, result.message);
}

export async function deleteSubscriber(req: Request, res: Response) {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return ApiResponse.error(res, 'Invalid id', null, 400);
  const result = await NewsletterService.remove(id);
  if (!result.success) return ApiResponse.error(res, result.message, null, result.statusCode ?? 400);
  await auditFromReq(req, 'newsletter.delete', { entityType: 'NewsletterSubscriber', entityId: id });
  return ApiResponse.success(res, result.data, result.message);
}
