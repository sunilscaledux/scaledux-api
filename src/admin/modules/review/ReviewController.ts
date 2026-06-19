import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '@services/prismaService';
import { ApiResponse } from '@utils/ApiResponse';
import { getPageParams, paginated, getDateRange } from '@admin/utils/pagination';
import { userCard, userCardSelect } from '@admin/utils/format';
import { auditFromReq } from '@admin/services/auditService';

export async function listReviews(req: Request, res: Response) {
  const { page, limit, skip } = getPageParams(req);
  const reviewType = req.query.review_type as string | undefined;
  const actionType = req.query.action_type as string | undefined;

  const where: Prisma.ReviewWhereInput = {};
  if (reviewType) where.review_type = reviewType;
  if (actionType) where.action_type = actionType;
  const created = getDateRange(req);
  if (created) where.created_at = created;

  const [rows, total] = await Promise.all([
    prisma.review.findMany({
      where,
      include: {
        review_from: { select: userCardSelect },
        review_to: { select: userCardSelect },
      },
      orderBy: { created_at: 'desc' },
      skip,
      take: limit,
    }),
    prisma.review.count({ where }),
  ]);

  const items = rows.map((r) => ({
    id: r.id,
    unique_id: r.unique_id,
    review_type: r.review_type,
    action_type: r.action_type,
    rating: Number(r.rating),
    feedback: r.feedback,
    created_at: r.created_at,
    from: userCard(r.review_from),
    to: userCard(r.review_to),
  }));
  return ApiResponse.success(res, paginated(items, total, page, limit));
}

/** Recompute a user's cached avg_rating from their PUBLIC reviews. */
async function recomputeAvgRating(userId: number) {
  const agg = await prisma.review.aggregate({
    _avg: { rating: true },
    where: { review_to_id: userId, review_type: 'PUBLIC' },
  });
  const avg = agg._avg.rating ? Number(agg._avg.rating) : 0;
  await prisma.user.update({ where: { id: userId }, data: { avg_rating: new Prisma.Decimal(avg.toFixed(1)) } });
}

export async function deleteReview(req: Request, res: Response) {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return ApiResponse.error(res, 'Invalid id', null, 400);

  const review = await prisma.review.findUnique({ where: { id } });
  if (!review) return ApiResponse.notFound(res, 'Review not found');

  await prisma.review.delete({ where: { id } });
  if (review.review_type === 'PUBLIC') await recomputeAvgRating(review.review_to_id);

  await auditFromReq(req, 'review.delete', { entityType: 'Review', entityId: id });
  return ApiResponse.success(res, null, 'Review removed');
}
