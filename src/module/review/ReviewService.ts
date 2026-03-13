import { prisma } from "@services/prismaService";
import { ServiceResponse } from "@utils/ApiResponse";
import { isValidContractEndReason } from "../../constants/contractEndReasons";
import { Log } from '@services/loggerService';

const ACTION_TYPE_PROPOSAL_CONTRACT = 'PROPOSAL_CONTRACT';

export interface CreateReviewInput {
  action_type: string;
  action_id: string;
  review_to_id: number;
  review_type: 'PUBLIC' | 'PRIVATE';
  rating: number;
  feedback?: string | null;
  end_reason?: string | null;
  ratings_extra?: Record<string, number> | null;
}

/**
 * For action_type PROPOSAL_CONTRACT: checks that the proposal exists and was created between
 * review_from_id and review_to_id (i.e. one is founder, one is provider).
 * Returns { success: true } when valid, or { success: false, message } when invalid.
 */
export async function validateProposalContractForReview(
  reviewFromId: number,
  reviewToId: number,
  actionId: string
): Promise<ServiceResponse> {
  const proposal = await (prisma as any).proposal.findFirst({
    where: { unique_id: actionId },
    include: { project: { select: { user_id: true } } }
  });
  if (!proposal) {
    return { success: false, message: 'Proposal not found' };
  }
  const founderId = proposal.project.user_id;
  const providerId = proposal.provider_id;
  const isBetweenParties =
    (reviewFromId === founderId && reviewToId === providerId) ||
    (reviewFromId === providerId && reviewToId === founderId);
  if (!isBetweenParties) {
    return { success: false, message: 'You can only review the other party for this contract' };
  }
  return { success: true, message: 'OK' };
}

/**
 * Create a single review row (either PUBLIC or PRIVATE).
 * For PROPOSAL_CONTRACT: validates proposal exists and is between reviewer and reviewee via validateProposalContractForReview.
 */
export async function createReview(
  reviewFromId: number,
  data: CreateReviewInput
): Promise<ServiceResponse> {
  try {
    const { action_type, action_id, review_to_id, review_type, rating, feedback, end_reason, ratings_extra } = data;

    if (!['PUBLIC', 'PRIVATE'].includes(review_type)) {
      return { success: false, message: 'review_type must be PUBLIC or PRIVATE' };
    }

    if (reviewFromId === review_to_id) {
      return { success: false, message: 'You cannot review yourself' };
    }

    const ratingNum = Number(rating);
    if (!Number.isFinite(ratingNum) || ratingNum < 0 || (review_type === 'PRIVATE' ? ratingNum > 10 : ratingNum > 5)) {
      return { success: false, message: review_type === 'PRIVATE' ? 'Rating must be between 0 and 10' : 'Rating must be between 0 and 5' };
    }

    if (action_type === ACTION_TYPE_PROPOSAL_CONTRACT) {
      const validation = await validateProposalContractForReview(reviewFromId, review_to_id, action_id);
      if (!validation.success) {
        return validation;
      }
    }

    if (review_type === 'PRIVATE' && end_reason != null && end_reason !== '') {
      if (!isValidContractEndReason(end_reason)) {
        return { success: false, message: 'Invalid reason for ending this contract' };
      }
    }

    const existing = await (prisma as any).review.findUnique({
      where: {
        review_from_id_review_to_id_action_type_action_id_review_type: {
          review_from_id: reviewFromId,
          review_to_id,
          action_type,
          action_id,
          review_type
        }
      }
    });
    if (existing) {
      return { success: false, message: `You have already submitted a ${review_type.toLowerCase()} review for this` };
    }

    const review = await (prisma as any).review.create({
      data: {
        review_from_id: reviewFromId,
        review_to_id,
        action_type,
        action_id,
        review_type,
        rating: ratingNum,
        feedback: feedback ?? null,
        end_reason: review_type === 'PRIVATE' ? (end_reason ?? null) : null,
        ratings_extra: review_type === 'PUBLIC' && ratings_extra ? ratings_extra : null
      },
      include: {
        review_from: { select: { id: true, first_name: true, last_name: true } },
        review_to: { select: { id: true, first_name: true, last_name: true } }
      }
    });

    return {
      success: true,
      message: `${review_type} review submitted successfully`,
      data: { review: { id: review.id, unique_id: review.unique_id, review_type: review.review_type } }
    };
  } catch (error: any) {
    Log.error("Error", { error });
    return { success: false, message: error.message || 'Failed to create review' };
  }
}

/**
 * Verify that the user is a real party to the proposal (founder or provider) before allowing access to reviews.
 * Look up proposal first; return failure if proposal not found or user is not a party.
 */
export async function verifyUserCanAccessProposalReviews(
  userId: number,
  proposalUniqueId: string
): Promise<{ success: true } | { success: false; message: string; statusCode: number }> {
  const proposal = await (prisma as any).proposal.findFirst({
    where: { unique_id: proposalUniqueId },
    include: { project: { select: { user_id: true } } }
  });
  if (!proposal) {
    return { success: false, message: 'Proposal not found', statusCode: 404 };
  }
  const founderId = proposal.project.user_id;
  const providerId = proposal.provider_id;
  if (userId !== founderId && userId !== providerId) {
    return { success: false, message: 'You do not have access to reviews for this contract', statusCode: 403 };
  }
  return { success: true };
}

/**
 * Get reviews for a proposal with pagination. Verifies user is a party to the proposal first.
 */
export async function getReviewsForProposal(
  userId: number,
  actionType: string,
  actionId: string,
  options: { limit?: number; offset?: number } = {}
): Promise<ServiceResponse & { statusCode?: number }> {
  try {
    const limit = Math.min(Math.max(Number(options.limit) || 40, 1), 100);
    const offset = Math.max(Number(options.offset) || 0, 0);

    if (actionType === ACTION_TYPE_PROPOSAL_CONTRACT) {
      const verification = await verifyUserCanAccessProposalReviews(userId, actionId);
      if (!verification.success) {
        return { success: false, message: verification.message, statusCode: verification.statusCode };
       }
    }

    const where = { action_type: actionType, action_id: actionId };

    const [reviews, total] = await Promise.all([
      (prisma as any).review.findMany({
        where,
        include: {
          review_from: { select: { id: true, unique_id: true, first_name: true, last_name: true } },
          review_to: { select: { id: true, unique_id: true, first_name: true, last_name: true } }
        },
        orderBy: { created_at: 'desc' },
        take: limit,
        skip: offset
      }),
      (prisma as any).review.count({ where })
    ]);

    const list = reviews.map((r: any) => ({
      id: r.id,
      unique_id: r.unique_id,
      review_from_id: r.review_from_id,
      review_to_id: r.review_to_id,
      action_type: r.action_type,
      action_id: r.action_id,
      review_type: r.review_type,
      rating: Number(r.rating),
      feedback: r.feedback,
      end_reason: r.end_reason,
      ratings_extra: r.ratings_extra,
      created_at: r.created_at,
      updated_at: r.updated_at,
      review_from: r.review_from,
      review_to: r.review_to
    }));

    return {
      success: true,
      data: {
        reviews: list,
        pagination: { limit, offset, total }
      },
      message: 'OK'
    };
  } catch (error: any) {
    Log.error("Error", { error });
    return { success: false, message: error.message || 'Failed to get reviews' };
  }
}

/**
 * Get reviews given by or received by the current user, with optional filter by review_type. Paginated.
 */
export async function getMyReviews(
  userId: number,
  filter: 'given' | 'taken',
  options: { review_type?: 'PUBLIC' | 'PRIVATE'; limit?: number; offset?: number } = {}
): Promise<ServiceResponse> {
  try {
    const limit = Math.min(Math.max(Number(options.limit) || 40, 1), 100);
    const offset = Math.max(Number(options.offset) || 0, 0);
    const review_type = options.review_type;

    const where: any =
      filter === 'given'
        ? { review_from_id: userId }
        : { review_to_id: userId };
    if (review_type) where.review_type = review_type;

    const [reviews, total] = await Promise.all([
      (prisma as any).review.findMany({
        where,
        include: {
          review_from: { select: { id: true, unique_id: true, first_name: true, last_name: true } },
          review_to: { select: { id: true, unique_id: true, first_name: true, last_name: true } }
        },
        orderBy: { created_at: 'desc' },
        take: limit,
        skip: offset
      }),
      (prisma as any).review.count({ where })
    ]);

    const list = reviews.map((r: any) => ({
      id: r.id,
      unique_id: r.unique_id,
      review_from_id: r.review_from_id,
      review_to_id: r.review_to_id,
      action_type: r.action_type,
      action_id: r.action_id,
      review_type: r.review_type,
      rating: Number(r.rating),
      feedback: r.feedback,
      end_reason: r.end_reason,
      ratings_extra: r.ratings_extra,
      created_at: r.created_at,
      updated_at: r.updated_at,
      review_from: r.review_from,
      review_to: r.review_to
    }));

    return {
      success: true,
      data: { reviews: list, pagination: { limit, offset, total } },
      message: 'OK'
    };
  } catch (error: any) {
    Log.error("Error", { error });
    return { success: false, message: error.message || 'Failed to get reviews' };
  }
}

/**
 * Update own review. Only review_from_id can update.
 */
export async function updateReview(
  userId: number,
  reviewUniqueId: string,
  data: { rating?: number; feedback?: string | null; end_reason?: string | null; ratings_extra?: Record<string, number> | null }
): Promise<ServiceResponse> {
  try {
    const review = await (prisma as any).review.findFirst({ where: { unique_id: reviewUniqueId } });
    if (!review) return { success: false, message: 'Review not found' };
    if (review.review_from_id !== userId) return { success: false, message: 'You can only edit your own review' };

    const updatePayload: any = {};
    if (data.rating != null) updatePayload.rating = data.rating;
    if (data.feedback !== undefined) updatePayload.feedback = data.feedback;
    if (data.end_reason !== undefined) updatePayload.end_reason = data.end_reason;
    if (data.ratings_extra !== undefined) updatePayload.ratings_extra = data.ratings_extra;

    await (prisma as any).review.update({
      where: { id: review.id },
      data: { ...updatePayload, updated_at: new Date() }
    });

    return { success: true, message: 'Review updated', data: { review: { unique_id: review.unique_id } } };
  } catch (error: any) {
    Log.error("Error", { error });
    return { success: false, message: error.message || 'Failed to update review' };
  }
}

/**
 * Get PUBLIC reviews received by a user (by profile unique_id). Public endpoint for profile page.
 */
export async function getPublicReviewsByProfileUniqueId(
  profileUniqueId: string,
  options: { limit?: number; offset?: number } = {}
): Promise<ServiceResponse> {
  try {
    const limit = Math.min(Math.max(Number(options.limit) || 20, 1), 100);
    const offset = Math.max(Number(options.offset) || 0, 0);

    const user = await prisma.user.findUnique({
      where: { unique_id: profileUniqueId },
      select: { id: true }
    });
    if (!user) {
      return { success: false, message: 'Profile not found' };
    }

    const where = { review_to_id: user.id, review_type: 'PUBLIC' as const };

    const [reviews, total] = await Promise.all([
      (prisma as any).review.findMany({
        where,
        select: {
          id: true,
          unique_id: true,
          review_from_id: true,
          review_to_id: true,
          action_type: true,
          action_id: true,
          review_type: true,
          rating: true,
          feedback: true,
          created_at: true,
          updated_at: true,
          review_from: {
            select: {
              id: true,
              unique_id: true,
              first_name: true,
              last_name: true,
              personalInfo: { select: { profileImage: true } }
            }
          }
        },
        orderBy: { created_at: 'desc' },
        take: limit,
        skip: offset
      }),
      (prisma as any).review.count({ where })
    ]);

    const ratingCounts = await (prisma as any).review.groupBy({
      by: ['rating'],
      where: { review_to_id: user.id, review_type: 'PUBLIC' },
      _count: { id: true }
    });

    const distribution: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    ratingCounts.forEach((r: any) => {
      const star = Math.round(Number(r.rating));
      if (star >= 1 && star <= 5) distribution[star] += r._count?.id ?? 0;
    });

    const avgResult = await (prisma as any).review.aggregate({
      where: { review_to_id: user.id, review_type: 'PUBLIC' },
      _avg: { rating: true }
    });
    const averageRating = avgResult._avg?.rating != null ? Number(Number(avgResult._avg.rating).toFixed(1)) : 0;

    const list = reviews.map((r: any) => ({
      id: r.id,
      unique_id: r.unique_id,
      review_from_id: r.review_from_id,
      review_to_id: r.review_to_id,
      action_type: r.action_type,
      action_id: r.action_id,
      review_type: r.review_type,
      rating: Number(r.rating),
      feedback: r.feedback,
      created_at: r.created_at,
      updated_at: r.updated_at,
      review_from: r.review_from
        ? {
            id: r.review_from.id,
            unique_id: r.review_from.unique_id,
            first_name: r.review_from.first_name,
            last_name: r.review_from.last_name,
            profileImage: r.review_from.personalInfo?.profileImage ?? null
          }
        : undefined
    }));

    return {
      success: true,
      data: {
        reviews: list,
        pagination: { limit, offset, total },
        averageRating,
        distribution
      },
      message: 'OK'
    };
  } catch (error: any) {
    Log.error("Error", { error });
    return { success: false, message: error.message || 'Failed to get reviews' };
  }
}

/**
 * Delete own review. Only review_from_id can delete.
 */
export async function deleteReview(userId: number, reviewUniqueId: string): Promise<ServiceResponse> {
  try {
    const review = await (prisma as any).review.findFirst({ where: { unique_id: reviewUniqueId } });
    if (!review) return { success: false, message: 'Review not found' };
    if (review.review_from_id !== userId) return { success: false, message: 'You can only delete your own review' };

    await (prisma as any).review.delete({ where: { id: review.id } });
    return { success: true, message: 'Review deleted' };
  } catch (error: any) {
    Log.error("Error", { error });
    return { success: false, message: error.message || 'Failed to delete review' };
  }
}
