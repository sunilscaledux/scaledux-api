import { Request, Response } from 'express';
import { ApiResponse } from '../../utils/ApiResponse';
import { calculateProfileCompletion, updateProfileCompletion } from '../../events/ProfileCompletionEvent';

/**
 * Get user's profile completion status
 */
const getProfileCompletion = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return ApiResponse.error(res, "User authentication required");
    }

    const completion = await calculateProfileCompletion(userId);

    return ApiResponse.success(
      res,
      completion,
      "Profile completion retrieved successfully"
    );
  } catch (error: any) {
    console.error('❌ Get profile completion error:', error);
    return ApiResponse.error(res, error.message || "Failed to get profile completion");
  }
};

/**
 * Trigger profile completion recalculation
 */
const recalculateProfileCompletion = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { field } = req.body;

    if (!userId) {
      return ApiResponse.error(res, "User authentication required");
    }

    const completion = await updateProfileCompletion(userId, field || 'manual_update');

    return ApiResponse.success(
      res,
      completion,
      "Profile completion updated successfully"
    );
  } catch (error: any) {
    console.error('❌ Update profile completion error:', error);
    return ApiResponse.error(res, error.message || "Failed to update profile completion");
  }
};

export {
  getProfileCompletion,
  recalculateProfileCompletion,
};
