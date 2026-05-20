import { Request, Response } from 'express';
import { ApiResponse } from '@utils/ApiResponse';
import { BlockService } from './BlockService';

export class BlockController {
  static async blockUser(req: Request, res: Response) {
    const userId = req.user?.id;
    if (!userId) return ApiResponse.error(res, 'User not authenticated', 401);

    const { uniqueId } = req.body;
    if (!uniqueId) return ApiResponse.error(res, 'uniqueId is required', 400);

    const result = await BlockService.blockUser(userId, uniqueId);
    if (result.success) return ApiResponse.success(res, null, result.message);
    return ApiResponse.error(res, result.message, 400);
  }

  static async unblockUser(req: Request, res: Response) {
    const userId = req.user?.id;
    if (!userId) return ApiResponse.error(res, 'User not authenticated', 401);

    const { uniqueId } = req.params;
    if (!uniqueId) return ApiResponse.error(res, 'uniqueId is required', 400);

    const result = await BlockService.unblockUser(userId, uniqueId);
    if (result.success) return ApiResponse.success(res, null, result.message);
    return ApiResponse.error(res, result.message, 400);
  }

  static async getBlockedUsers(req: Request, res: Response) {
    const userId = req.user?.id;
    if (!userId) return ApiResponse.error(res, 'User not authenticated', 401);

    const result = await BlockService.getBlockedUsers(userId);
    if (result.success) return ApiResponse.success(res, result.data, result.message);
    return ApiResponse.error(res, result.message);
  }
}
