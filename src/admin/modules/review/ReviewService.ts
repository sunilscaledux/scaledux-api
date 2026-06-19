import { Prisma } from '@prisma/client';
import { prisma } from '@services/prismaService';
import { ServiceResponse } from '@utils/ApiResponse';
import { paginated } from '@admin/utils/pagination';
import { userCard, userCardSelect } from '@admin/utils/format';

export interface ReviewListParams {
  page: number;
  limit: number;
  skip: number;
  reviewType?: string;
  actionType?: string;
  userId?: string;
  created?: Prisma.DateTimeFilter | undefined;
}

export class ReviewService {
  static async list(p: ReviewListParams): Promise<ServiceResponse> {
    const where: Prisma.ReviewWhereInput = {};
    if (p.reviewType) where.review_type = p.reviewType;
    if (p.actionType) where.action_type = p.actionType;
    if (p.userId) where.review_to_id = Number(p.userId);
    if (p.created) where.created_at = p.created;

    const [rows, total] = await Promise.all([
      prisma.review.findMany({
        where,
        include: {
          review_from: { select: userCardSelect },
          review_to: { select: userCardSelect },
        },
        orderBy: { created_at: 'desc' },
        skip: p.skip,
        take: p.limit,
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
    return { success: true, message: 'OK', data: paginated(items, total, p.page, p.limit) };
  }

  static async getOne(id: number): Promise<ServiceResponse> {
    const r = await prisma.review.findUnique({
      where: { id },
      include: {
        review_from: { select: userCardSelect },
        review_to: { select: userCardSelect },
      },
    });
    if (!r) return { success: false, message: 'Review not found', statusCode: 404 };

    const context = await this.resolveContext(r.action_type, r.action_id);
    return {
      success: true,
      message: 'OK',
      data: {
        id: r.id,
        unique_id: r.unique_id,
        review_type: r.review_type,
        action_type: r.action_type,
        action_id: r.action_id,
        rating: Number(r.rating),
        feedback: r.feedback,
        end_reason: r.end_reason,
        ratings_extra: r.ratings_extra,
        created_at: r.created_at,
        updated_at: r.updated_at,
        from: userCard(r.review_from),
        to: userCard(r.review_to),
        context,
      },
    };
  }

  static async update(
    id: number,
    body: { rating?: unknown; feedback?: unknown }
  ): Promise<ServiceResponse> {
    const review = await prisma.review.findUnique({ where: { id } });
    if (!review) return { success: false, message: 'Review not found', statusCode: 404 };

    const data: Prisma.ReviewUpdateInput = {};
    if (body.rating !== undefined) {
      const num = Number(body.rating);
      const max = review.review_type === 'PUBLIC' ? 5 : 10;
      if (isNaN(num) || num < 0 || num > max) {
        return { success: false, message: `Rating must be between 0 and ${max}`, statusCode: 400 };
      }
      data.rating = new Prisma.Decimal(num.toFixed(2));
    }
    if (body.feedback !== undefined) {
      data.feedback = body.feedback === '' ? null : String(body.feedback);
    }
    if (Object.keys(data).length === 0) {
      return { success: false, message: 'Nothing to update', statusCode: 400 };
    }

    const updated = await prisma.review.update({ where: { id }, data });
    if (review.review_type === 'PUBLIC' && body.rating !== undefined) {
      await this.recomputeAvgRating(review.review_to_id);
    }
    return { success: true, message: 'Review updated', data: { ...updated, rating: Number(updated.rating) } };
  }

  static async remove(id: number): Promise<ServiceResponse> {
    const review = await prisma.review.findUnique({ where: { id } });
    if (!review) return { success: false, message: 'Review not found', statusCode: 404 };

    await prisma.review.delete({ where: { id } });
    if (review.review_type === 'PUBLIC') await this.recomputeAvgRating(review.review_to_id);
    return { success: true, message: 'Review removed' };
  }

  /** Recompute a user's cached avg_rating from their PUBLIC reviews. */
  private static async recomputeAvgRating(userId: number) {
    const agg = await prisma.review.aggregate({
      _avg: { rating: true },
      where: { review_to_id: userId, review_type: 'PUBLIC' },
    });
    const avg = agg._avg.rating ? Number(agg._avg.rating) : 0;
    await prisma.user.update({ where: { id: userId }, data: { avg_rating: new Prisma.Decimal(avg.toFixed(1)) } });
  }

  /** Resolve the proposal/booking a review is attached to (action_type/action_id). */
  private static async resolveContext(actionType: string, actionId: string) {
    if (actionType === 'BOOKING') {
      const b = await prisma.booking.findUnique({
        where: { unique_id: actionId },
        select: { unique_id: true, title: true, status: true, amount: true, scheduled_at: true },
      });
      if (!b) return null;
      return {
        kind: 'booking' as const,
        unique_id: b.unique_id,
        title: b.title,
        status: b.status,
        amount: b.amount != null ? Number(b.amount) : null,
        scheduled_at: b.scheduled_at,
      };
    }
    const p = await prisma.proposal.findUnique({
      where: { unique_id: actionId },
      select: {
        unique_id: true,
        status: true,
        proposed_amount: true,
        project: { select: { unique_id: true, project_title: true } },
      },
    });
    if (!p) return null;
    return {
      kind: 'proposal' as const,
      unique_id: p.unique_id,
      status: p.status,
      amount: p.proposed_amount != null ? Number(p.proposed_amount) : null,
      project_title: p.project?.project_title ?? null,
      project_unique_id: p.project?.unique_id ?? null,
    };
  }
}
