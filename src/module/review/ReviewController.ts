import { Request, Response } from "express";
import { ApiResponse } from "@utils/ApiResponse";
import {
  createReview as createReviewService,
  getReviewsForProposal,
  getMyReviews as getMyReviewsService,
  updateReview as updateReviewService,
  deleteReview as deleteReviewService
} from "./ReviewService";

/**
 * POST /reviews - Create a review (one row: PUBLIC or PRIVATE)
 * Body: action_type, action_id, review_to_id, review_type (PUBLIC|PRIVATE), rating, feedback?, end_reason? (for PRIVATE), ratings_extra? (for PUBLIC)
 */
export async function createReview(req: Request, res: Response) {
  const userId = req.user?.id;
  const { action_type, action_id, review_to_id, review_type, rating, feedback, end_reason, ratings_extra } = req.body;

  if (!userId) {
    return ApiResponse.error(res, "User not authenticated", 401);
  }

  if (!action_type || !action_id || review_to_id == null) {
    return ApiResponse.error(res, "action_type, action_id and review_to_id are required", 400);
  }

  if (!review_type || !['PUBLIC', 'PRIVATE'].includes(review_type)) {
    return ApiResponse.error(res, "review_type must be PUBLIC or PRIVATE", 400);
  }

  if (rating == null || !Number.isFinite(Number(rating))) {
    return ApiResponse.error(res, "rating is required and must be a number", 400);
  }

  const result = await createReviewService(userId, {
    action_type: String(action_type),
    action_id: String(action_id),
    review_to_id: Number(review_to_id),
    review_type: review_type as 'PUBLIC' | 'PRIVATE',
    rating: Number(rating),
    feedback: feedback ?? null,
    end_reason: end_reason ?? null,
    ratings_extra: ratings_extra && typeof ratings_extra === 'object' ? ratings_extra : null
  });

  if (result.success) {
    return ApiResponse.success(res, result.data, result.message!, 201);
  }
  return ApiResponse.error(res, result.message!, 400);
}

/**
 * GET /reviews?action_type=PROPOSAL_CONTRACT&action_id=:proposalUniqueId&limit=40&offset=0
 * Verifies user is a party to the proposal. Pagination: limit (default 40, max 100), offset (default 0).
 */
export async function listReviews(req: Request, res: Response) {
  const userId = req.user?.id;
  const action_type = req.query.action_type as string;
  const action_id = req.query.action_id as string;
  const limit = req.query.limit != null ? Number(req.query.limit) : 40;
  const offset = req.query.offset != null ? Number(req.query.offset) : 0;

  if (!userId) return ApiResponse.error(res, "User not authenticated", 401);
  if (!action_type || !action_id) return ApiResponse.error(res, "action_type and action_id are required", 400);

  const result = await getReviewsForProposal(userId, action_type, action_id, { limit, offset });
  if (!result.success) {
    const status = (result as { statusCode?: number }).statusCode ?? 400;
    return ApiResponse.error(res, result.message!, null, status);
  }
  return ApiResponse.success(res, result.data, result.message!);
}

/**
 * GET /reviews/me?filter=given|taken&review_type=PUBLIC|PRIVATE&limit=40&offset=0
 * Returns reviews given by (filter=given) or received by (filter=taken) the current user. Optional review_type. Paginated.
 */
export async function listMyReviews(req: Request, res: Response) {
  const userId = req.user?.id;
  const filter = req.query.filter as string;
  const review_type = req.query.review_type as string | undefined;
  const limit = req.query.limit != null ? Number(req.query.limit) : 40;
  const offset = req.query.offset != null ? Number(req.query.offset) : 0;

  if (!userId) return ApiResponse.error(res, "User not authenticated", 401);
  if (!filter || !['given', 'taken'].includes(filter))
    return ApiResponse.error(res, "filter is required and must be 'given' or 'taken'", 400);

  const result = await getMyReviewsService(userId, filter as 'given' | 'taken', {
    review_type: review_type === 'PUBLIC' || review_type === 'PRIVATE' ? review_type : undefined,
    limit,
    offset
  });
  if (!result.success) return ApiResponse.error(res, result.message!, 400);
  return ApiResponse.success(res, result.data, result.message!);
}

/**
 * PATCH /reviews/:uniqueId - update own review
 */
export async function updateReview(req: Request, res: Response) {
  const userId = req.user?.id;
  const uniqueId = req.params.uniqueId as string;
  const { rating, feedback, end_reason, ratings_extra } = req.body;

  if (!userId) return ApiResponse.error(res, "User not authenticated", 401);
  if (!uniqueId) return ApiResponse.error(res, "Review id is required", 400);

  const result = await updateReviewService(userId, uniqueId, {
    rating: rating != null ? Number(rating) : undefined,
    feedback,
    end_reason,
    ratings_extra: ratings_extra && typeof ratings_extra === "object" ? ratings_extra : undefined
  });
  if (!result.success) return ApiResponse.error(res, result.message!, 400);
  return ApiResponse.success(res, result.data, result.message!);
}

/**
 * DELETE /reviews/:uniqueId - delete own review
 */
export async function deleteReview(req: Request, res: Response) {
  const userId = req.user?.id;
  const uniqueId = req.params.uniqueId as string;

  if (!userId) return ApiResponse.error(res, "User not authenticated", 401);
  if (!uniqueId) return ApiResponse.error(res, "Review id is required", 400);

  const result = await deleteReviewService(userId, uniqueId);
  if (!result.success) return ApiResponse.error(res, result.message!, 400);
  return ApiResponse.success(res, result.data, result.message!);
}
