import { Request, Response } from 'express';
import { ApiResponse } from '@utils/ApiResponse';
import { NotificationService } from './NotificationService';

export class NotificationController {
  private static parseNotificationId(req: Request): number | null {
    const rawId = req.params.id;
    const idValue = Array.isArray(rawId) ? rawId[0] : rawId;
    const id = parseInt(idValue, 10);
    return Number.isNaN(id) ? null : id;
  }

  static async list(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) return ApiResponse.error(res, 'Unauthorized', 401);
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
      const offset = Math.max(0, parseInt(req.query.offset as string) || 0);
      const result = await NotificationService.list(userId, limit, offset);
      if (result.success) return ApiResponse.success(res, result.data, result.message);
      return ApiResponse.error(res, result.message, 404);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to list notifications';
      return ApiResponse.error(res, message);
    }
  }

  static async markAsRead(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) return ApiResponse.error(res, 'Unauthorized', 401);
      const id = this.parseNotificationId(req);
      if (id === null) return ApiResponse.error(res, 'Invalid id', 400);
      const result = await NotificationService.markAsRead(userId, id);
      if (result.success) return ApiResponse.success(res, result.data, result.message);
      return ApiResponse.error(res, result.message, 404);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to mark as read';
      return ApiResponse.error(res, message);
    }
  }

  static async markAsUnread(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) return ApiResponse.error(res, 'Unauthorized', 401);
      const id = this.parseNotificationId(req);
      if (id === null) return ApiResponse.error(res, 'Invalid id', 400);
      const result = await NotificationService.markAsUnread(userId, id);
      if (result.success) return ApiResponse.success(res, result.data, result.message);
      return ApiResponse.error(res, result.message, 404);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to mark as unread';
      return ApiResponse.error(res, message);
    }
  }

  static async markAllAsRead(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) return ApiResponse.error(res, 'Unauthorized', 401);
      const result = await NotificationService.markAllAsRead(userId);
      if (result.success) return ApiResponse.success(res, result.data, result.message);
      return ApiResponse.error(res, result.message);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to mark all as read';
      return ApiResponse.error(res, message);
    }
  }

  static async remove(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) return ApiResponse.error(res, 'Unauthorized', 401);
      const id = this.parseNotificationId(req);
      if (id === null) return ApiResponse.error(res, 'Invalid id', 400);
      const result = await NotificationService.remove(userId, id);
      if (result.success) return ApiResponse.success(res, result.data, result.message);
      return ApiResponse.error(res, result.message, 404);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to delete notification';
      return ApiResponse.error(res, message);
    }
  }

  static async hide(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) return ApiResponse.error(res, 'Unauthorized', 401);
      const id = this.parseNotificationId(req);
      if (id === null) return ApiResponse.error(res, 'Invalid id', 400);
      const result = await NotificationService.hide(userId, id);
      if (result.success) return ApiResponse.success(res, result.data, result.message);
      return ApiResponse.error(res, result.message, 404);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to hide notification';
      return ApiResponse.error(res, message);
    }
  }

  static async getUnreadCount(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) return ApiResponse.error(res, 'Unauthorized', 401);
      const result = await NotificationService.getUnreadCount(userId);
      if (result.success) return ApiResponse.success(res, result.data, result.message);
      return ApiResponse.error(res, result.message, 404);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to get unread count';
      return ApiResponse.error(res, message);
    }
  }
}
