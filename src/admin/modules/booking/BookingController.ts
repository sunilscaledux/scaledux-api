import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '@services/prismaService';
import { ApiResponse } from '@utils/ApiResponse';
import { getPageParams, paginated, getDateRange } from '@admin/utils/pagination';
import { userCard, userCardSelect } from '@admin/utils/format';
import { auditFromReq } from '@admin/services/auditService';

export async function listBookings(req: Request, res: Response) {
  const { page, limit, skip } = getPageParams(req);
  const status = req.query.status as string | undefined;
  const paymentStatus = req.query.payment_status as string | undefined;

  const where: Prisma.BookingWhereInput = {};
  if (status) where.status = status;
  if (paymentStatus) where.payment_status = paymentStatus;
  const created = getDateRange(req);
  if (created) where.created_at = created;

  const [rows, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      include: {
        mentor: { select: userCardSelect },
        user: { select: userCardSelect },
      },
      orderBy: { scheduled_at: 'desc' },
      skip,
      take: limit,
    }),
    prisma.booking.count({ where }),
  ]);

  const items = rows.map((b) => ({
    id: b.id,
    unique_id: b.unique_id,
    title: b.title,
    status: b.status,
    payment_status: b.payment_status,
    amount: Number(b.amount),
    duration: b.duration,
    scheduled_at: b.scheduled_at,
    meeting_provider: b.meeting_provider,
    mentor: userCard(b.mentor),
    user: userCard(b.user),
  }));
  return ApiResponse.success(res, paginated(items, total, page, limit));
}

export async function getBooking(req: Request, res: Response) {
  const { uniqueId } = req.params;
  const b = await prisma.booking.findUnique({
    where: { unique_id: uniqueId },
    include: {
      mentor: { select: userCardSelect },
      user: { select: userCardSelect },
      activities: { orderBy: { created_at: 'desc' } },
      billing_transaction: true,
    },
  });
  if (!b) return ApiResponse.notFound(res, 'Booking not found');

  return ApiResponse.success(res, {
    ...b,
    amount: Number(b.amount),
    platform_fee: b.platform_fee != null ? Number(b.platform_fee) : null,
    mentor: userCard(b.mentor),
    user: userCard(b.user),
  });
}

export async function updateBookingStatus(req: Request, res: Response) {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return ApiResponse.error(res, 'Invalid id', null, 400);
  const { status, reason } = req.body || {};
  if (!status) return ApiResponse.error(res, 'status is required', null, 400);

  const data: Prisma.BookingUpdateInput = { status };
  if (status === 'CANCELLED') {
    data.cancelled_at = new Date();
    data.cancelled_by = req.admin!.id;
  }

  const b = await prisma.booking.update({ where: { id }, data });
  await prisma.bookingActivity.create({
    data: { booking_id: id, action: status, reason: reason ?? null, remark: 'By admin', acted_by: req.admin!.id },
  }).catch(() => undefined);

  await auditFromReq(req, 'booking.update_status', { entityType: 'Booking', entityId: id, metadata: { status } });
  return ApiResponse.success(res, { id: b.id, status: b.status }, 'Booking status updated');
}
