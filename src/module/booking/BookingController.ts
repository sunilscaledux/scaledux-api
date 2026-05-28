import { Request, Response } from 'express';
import { BookingService } from './BookingService';
import { ApiResponse } from '@utils/ApiResponse';

export class BookingController {
  static async createBooking(req: Request, res: Response) {
    const userId = req.user?.id;
    if (!userId) return ApiResponse.error(res, 'User not authenticated', 401);

    const { mentorUniqueId, duration, scheduledAt, message, rescheduleFromId, rescheduleReason, rescheduleRemark } = req.body;
    if (!mentorUniqueId || !duration || !scheduledAt) {
      return ApiResponse.error(res, 'mentorUniqueId, duration, and scheduledAt are required', 400);
    }

    const result = await BookingService.createBooking(userId, {
      mentorUniqueId,
      duration: Number(duration),
      scheduledAt,
      message,
      rescheduleFromId,
      rescheduleReason,
      rescheduleRemark,
    });

    if (result.success) return ApiResponse.success(res, result.data, result.message, 201);
    return ApiResponse.error(res, result.message, 400);
  }

  static async createOrder(req: Request, res: Response) {
    const userId = req.user?.id;
    if (!userId) return ApiResponse.error(res, 'User not authenticated', 401);

    const { uniqueId } = req.params;
    const result = await BookingService.createOrder(userId, uniqueId);

    if (result.success) return ApiResponse.success(res, result.data, result.message);
    return ApiResponse.error(res, result.message, 400);
  }

  static async verifyPayment(req: Request, res: Response) {
    const userId = req.user?.id;
    if (!userId) return ApiResponse.error(res, 'User not authenticated', 401);

    const { uniqueId } = req.params;
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return ApiResponse.error(res, 'Missing payment verification data', 400);
    }

    const result = await BookingService.verifyPayment(userId, uniqueId, {
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    });

    if (result.success) return ApiResponse.success(res, result.data, result.message);
    return ApiResponse.error(res, result.message, 400);
  }

  static async getAnalytics(req: Request, res: Response) {
    const userId = req.user?.id;
    if (!userId) return ApiResponse.error(res, 'User not authenticated', 401);

    const period = (req.query.period as string) || 'this-month';
    const result = await BookingService.getAnalytics(userId, period);

    if (result.success) return ApiResponse.success(res, result.data, result.message);
    return ApiResponse.error(res, result.message);
  }

  static async listBookings(req: Request, res: Response) {
    const userId = req.user?.id;
    if (!userId) return ApiResponse.error(res, 'User not authenticated', 401);

    const { role, status, limit, cursor } = req.query;
    const result = await BookingService.listBookings(userId, {
      role: role === 'mentor' ? 'mentor' : 'user',
      status: status ? String(status) : undefined,
      limit: limit ? parseInt(String(limit)) : 16,
      cursor: cursor ? String(cursor) : undefined,
    });

    if (result.success) return ApiResponse.success(res, result.data, result.message);
    return ApiResponse.error(res, result.message);
  }

  static async getBooking(req: Request, res: Response) {
    const userId = req.user?.id;
    if (!userId) return ApiResponse.error(res, 'User not authenticated', 401);

    const result = await BookingService.getBookingById(userId, req.params.uniqueId);
    if (result.success) return ApiResponse.success(res, result.data, result.message);
    return ApiResponse.error(res, result.message);
  }

  static async cancelBooking(req: Request, res: Response) {
    const userId = req.user?.id;
    if (!userId) return ApiResponse.error(res, 'User not authenticated', 401);

    const { reason, remark } = req.body;
    const result = await BookingService.cancelBooking(userId, req.params.uniqueId, reason, remark);

    if (result.success) return ApiResponse.success(res, result.data, result.message);
    return ApiResponse.error(res, result.message, 400);
  }

  static async addMeetingLink(req: Request, res: Response) {
    const userId = req.user?.id;
    if (!userId) return ApiResponse.error(res, 'User not authenticated', 401);

    const { uniqueId } = req.params;
    const { provider, manualLink } = req.body;
    if (!provider) return ApiResponse.error(res, 'provider is required', 400);

    const result = await BookingService.addMeetingLink(userId, uniqueId, { provider, manualLink });
    if (result.success) return ApiResponse.success(res, result.data, result.message);
    return ApiResponse.error(res, result.message, 400);
  }

  static async completeBooking(req: Request, res: Response) {
    const userId = req.user?.id;
    if (!userId) return ApiResponse.error(res, 'User not authenticated', 401);

    const { uniqueId } = req.params;
    const { success, reason, remark } = req.body;
    if (typeof success !== 'boolean') {
      return ApiResponse.error(res, 'success (boolean) is required', 400);
    }

    const result = await BookingService.completeBooking(userId, uniqueId, { success, reason, remark });
    if (result.success) return ApiResponse.success(res, result.data, result.message);
    return ApiResponse.error(res, result.message, 400);
  }

  static async acceptCompletion(req: Request, res: Response) {
    const userId = req.user?.id;
    if (!userId) return ApiResponse.error(res, 'User not authenticated', 401);

    const result = await BookingService.acceptCompletion(userId, req.params.uniqueId);
    if (result.success) return ApiResponse.success(res, result.data, result.message);
    return ApiResponse.error(res, result.message, 400);
  }

  static async getOccupiedSlots(req: Request, res: Response) {
    const { mentorId } = req.params;
    const { date } = req.query;
    if (!mentorId || !date) return ApiResponse.error(res, 'mentorId and date are required', 400);

    const result = await BookingService.getOccupiedSlots(mentorId, String(date));
    if (result.success) return ApiResponse.success(res, result.data, result.message);
    return ApiResponse.error(res, result.message);
  }
}
