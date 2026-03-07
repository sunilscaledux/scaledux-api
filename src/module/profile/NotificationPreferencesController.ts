import { Request, Response } from 'express';
import { ApiResponse } from '@utils/ApiResponse';
import { NotificationPreferencesService } from './NotificationPreferencesService';

export class NotificationPreferencesController {
  static async getTypes(req: Request, res: Response) {
    try {
      const result = await NotificationPreferencesService.getTypes();
      if (result.success) return ApiResponse.success(res, result.data, result.message);
      return ApiResponse.error(res, result.message, 404);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to fetch notification types';
      return ApiResponse.error(res, message);
    }
  }

  static async getPreferences(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) return ApiResponse.error(res, 'Unauthorized', 401);
      const result = await NotificationPreferencesService.getPreferences(userId);
      if (result.success) return ApiResponse.success(res, result.data, result.message);
      return ApiResponse.error(res, result.message, 404);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to fetch preferences';
      return ApiResponse.error(res, message);
    }
  }

  static async updatePreferences(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) return ApiResponse.error(res, 'Unauthorized', 401);
      const body = req.body?.preferences ?? req.body;
      if (typeof body !== 'object' || body === null) {
        return ApiResponse.error(res, 'Invalid body: expected preferences object', 400);
      }
      const result = await NotificationPreferencesService.updatePreferences(userId, body);
      if (result.success) return ApiResponse.success(res, result.data, result.message);
      return ApiResponse.error(res, result.message);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to update preferences';
      return ApiResponse.error(res, message);
    }
  }
}
