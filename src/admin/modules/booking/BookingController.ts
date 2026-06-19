import { Request, Response } from 'express';
import { ApiResponse } from '@utils/ApiResponse';
import { getPageParams, getDateRange } from '@admin/utils/pagination';
import { auditFromReq } from '@admin/services/auditService';
import { BookingService } from './BookingService';

export async function listBookings(req: Request, res: Response) {
  const { page, limit, skip } = getPageParams(req);
  const result = await BookingService.list({
    page,
    limit,
    skip,
    status: req.query.status as string | undefined,
    paymentStatus: req.query.payment_status as string | undefined,
    userId: req.query.userId as string | undefined,
    created: getDateRange(req),
  });
  return ApiResponse.success(res, result.data);
}

export async function getBooking(req: Request, res: Response) {
  const { uniqueId } = req.params;
  const result = await BookingService.getOne(uniqueId);
  if (!result.success) return ApiResponse.notFound(res, result.message);
  return ApiResponse.success(res, result.data);
}

export async function updateBookingStatus(req: Request, res: Response) {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return ApiResponse.error(res, 'Invalid id', null, 400);
  const result = await BookingService.updateStatus(id, req.body || {}, req.admin!.id);
  if (!result.success) return ApiResponse.error(res, result.message, null, result.statusCode ?? 400);
  await auditFromReq(req, 'booking.update_status', { entityType: 'Booking', entityId: id, metadata: { status: req.body?.status } });
  return ApiResponse.success(res, result.data, result.message);
}
