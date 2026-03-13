import { Request, Response } from 'express';
import { ApiResponse } from '../../utils/ApiResponse';
import { calculateProfileCompletion } from "./ProfileCompletionService";
import { Log } from '@services/loggerService';

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
    Log.error("Error", { error });
    return ApiResponse.error(res, error.message || "Failed to get profile completion");
  }
};

export {
  getProfileCompletion,
};
