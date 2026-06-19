import { Request, Response } from 'express';
import { ApiResponse } from '@utils/ApiResponse';
import { getPageParams, getDateRange } from '@admin/utils/pagination';
import { auditFromReq } from '@admin/services/auditService';
import { ReviewService } from './ReviewService';

export async function listReviews(req: Request, res: Response) {
  const { page, limit, skip } = getPageParams(req);
  const result = await ReviewService.list({
    page,
    limit,
    skip,
    reviewType: req.query.review_type as string | undefined,
    actionType: req.query.action_type as string | undefined,
    userId: req.query.userId as string | undefined,
    created: getDateRange(req),
  });
  return ApiResponse.success(res, result.data);
}

export async function getReview(req: Request, res: Response) {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return ApiResponse.error(res, 'Invalid id', null, 400);
  const result = await ReviewService.getOne(id);
  if (!result.success) return ApiResponse.notFound(res, result.message);
  return ApiResponse.success(res, result.data);
}

export async function updateReview(req: Request, res: Response) {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return ApiResponse.error(res, 'Invalid id', null, 400);
  const result = await ReviewService.update(id, req.body || {});
  if (!result.success) return ApiResponse.error(res, result.message, null, result.statusCode ?? 400);
  await auditFromReq(req, 'review.update', { entityType: 'Review', entityId: id });
  return ApiResponse.success(res, result.data, result.message);
}

export async function deleteReview(req: Request, res: Response) {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return ApiResponse.error(res, 'Invalid id', null, 400);
  const result = await ReviewService.remove(id);
  if (!result.success) return ApiResponse.notFound(res, result.message);
  await auditFromReq(req, 'review.delete', { entityType: 'Review', entityId: id });
  return ApiResponse.success(res, null, result.message);
}
