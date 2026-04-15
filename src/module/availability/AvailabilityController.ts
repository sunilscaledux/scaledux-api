import { Request, Response } from 'express';
import { AvailabilityService } from './AvailabilityService';
import { ApiResponse } from '@utils/ApiResponse';

export class AvailabilityController {
  static async saveAvailability(req: Request, res: Response) {
    const userId = req.user?.id;
    if (!userId) return ApiResponse.error(res, 'User not authenticated', 401);

    const { timezone, availability, unavailability, restBreak } = req.body;
    if (!timezone || !availability) {
      return ApiResponse.error(res, 'timezone and availability are required', 400);
    }

    const result = await AvailabilityService.saveAvailability(userId, {
      timezone,
      availability,
      unavailability,
      restBreak,
    });

    if (result.success) return ApiResponse.success(res, result.data, result.message);
    return ApiResponse.error(res, result.message, 400);
  }

  static async getAvailability(req: Request, res: Response) {
    const userId = req.user?.id;
    if (!userId) return ApiResponse.error(res, 'User not authenticated', 401);

    const result = await AvailabilityService.getAvailability(userId);
    if (result.success) return ApiResponse.success(res, result.data, result.message);
    return ApiResponse.error(res, result.message);
  }

  static async getPublicAvailability(req: Request, res: Response) {
    const { uniqueId } = req.params;
    if (!uniqueId) return ApiResponse.error(res, 'User ID is required', 400);

    const result = await AvailabilityService.getPublicAvailability(uniqueId);
    if (result.success) return ApiResponse.success(res, result.data, result.message);
    return ApiResponse.error(res, result.message);
  }
}
