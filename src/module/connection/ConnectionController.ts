import { Request, Response } from 'express';
import { ApiResponse } from '@utils/ApiResponse';
import { ConnectionService } from './ConnectionService';

export class ConnectionController {
  /** POST /connections/request — send a connection request */
  static async sendRequest(req: Request, res: Response) {
    const userId = req.user?.id;
    if (!userId) return ApiResponse.error(res, 'User not authenticated', 401);

    const { uniqueId, note } = req.body;
    if (!uniqueId) return ApiResponse.error(res, 'uniqueId is required', 400);

    const result = await ConnectionService.sendRequest(userId, uniqueId, note);
    if (result.success) return ApiResponse.success(res, result.data, result.message);
    return ApiResponse.error(res, result.message, 400);
  }

  /** PATCH /connections/:id/accept — accept a connection request */
  static async acceptRequest(req: Request, res: Response) {
    const userId = req.user?.id;
    if (!userId) return ApiResponse.error(res, 'User not authenticated', 401);

    const connectionId = parseInt(req.params.id, 10);
    if (isNaN(connectionId)) return ApiResponse.error(res, 'Invalid connection ID', 400);

    const result = await ConnectionService.acceptRequest(userId, connectionId);
    if (result.success) return ApiResponse.success(res, result.data, result.message);
    return ApiResponse.error(res, result.message, 400);
  }

  /** PATCH /connections/:id/reject — reject a connection request */
  static async rejectRequest(req: Request, res: Response) {
    const userId = req.user?.id;
    if (!userId) return ApiResponse.error(res, 'User not authenticated', 401);

    const connectionId = parseInt(req.params.id, 10);
    if (isNaN(connectionId)) return ApiResponse.error(res, 'Invalid connection ID', 400);

    const result = await ConnectionService.rejectRequest(userId, connectionId);
    if (result.success) return ApiResponse.success(res, result.data, result.message);
    return ApiResponse.error(res, result.message, 400);
  }

  /** PATCH /connections/:id/withdraw — withdraw a sent request */
  static async withdrawRequest(req: Request, res: Response) {
    const userId = req.user?.id;
    if (!userId) return ApiResponse.error(res, 'User not authenticated', 401);

    const connectionId = parseInt(req.params.id, 10);
    if (isNaN(connectionId)) return ApiResponse.error(res, 'Invalid connection ID', 400);

    const result = await ConnectionService.withdrawRequest(userId, connectionId);
    if (result.success) return ApiResponse.success(res, result.data, result.message);
    return ApiResponse.error(res, result.message, 400);
  }

  /** GET /connections/status/:uniqueId — get connection status with another user */
  static async getStatus(req: Request, res: Response) {
    const userId = req.user?.id;
    if (!userId) return ApiResponse.error(res, 'User not authenticated', 401);

    const uniqueId = req.params.uniqueId as string;
    if (!uniqueId) return ApiResponse.error(res, 'Unique ID is required', 400);

    const result = await ConnectionService.getConnectionStatus(userId, uniqueId);
    if (result.success) return ApiResponse.success(res, result.data, result.message);
    return ApiResponse.error(res, result.message, 400);
  }

  /** GET /connections/requests — list received pending requests */
  static async getReceivedRequests(req: Request, res: Response) {
    const userId = req.user?.id;
    if (!userId) return ApiResponse.error(res, 'User not authenticated', 401);

    const limit = Math.min(parseInt(req.query.limit as string, 10) || 20, 50);
    const offset = parseInt(req.query.offset as string, 10) || 0;
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : undefined;
    const role = typeof req.query.role === 'string' ? req.query.role.trim() : undefined;

    const result = await ConnectionService.getReceivedRequests(userId, limit, offset, search, role);
    if (result.success) return ApiResponse.success(res, result.data, result.message);
    return ApiResponse.error(res, result.message, 400);
  }

  /** GET /connections — list all accepted connections */
  static async getConnections(req: Request, res: Response) {
    const userId = req.user?.id;
    if (!userId) return ApiResponse.error(res, 'User not authenticated', 401);

    const limit = Math.min(parseInt(req.query.limit as string, 10) || 20, 50);
    const offset = parseInt(req.query.offset as string, 10) || 0;
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : undefined;
    const role = typeof req.query.role === 'string' ? req.query.role.trim() : undefined;

    const result = await ConnectionService.getConnections(userId, limit, offset, search, role);
    if (result.success) return ApiResponse.success(res, result.data, result.message);
    return ApiResponse.error(res, result.message, 400);
  }

  /** GET /connections/sent — list sent pending requests */
  static async getSentRequests(req: Request, res: Response) {
    const userId = req.user?.id;
    if (!userId) return ApiResponse.error(res, 'User not authenticated', 401);

    const limit = Math.min(parseInt(req.query.limit as string, 10) || 20, 50);
    const offset = parseInt(req.query.offset as string, 10) || 0;
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : undefined;
    const role = typeof req.query.role === 'string' ? req.query.role.trim() : undefined;

    const result = await ConnectionService.getSentRequests(userId, limit, offset, search, role);
    if (result.success) return ApiResponse.success(res, result.data, result.message);
    return ApiResponse.error(res, result.message, 400);
  }
}
