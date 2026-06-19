import { Prisma } from '@prisma/client';
import { prisma } from '@services/prismaService';
import { ServiceResponse } from '@utils/ApiResponse';
import { paginated } from '@admin/utils/pagination';
import { userCard, userCardSelect } from '@admin/utils/format';

export interface BookingListParams {
  page: number;
  limit: number;
  skip: number;
  status?: string;
  paymentStatus?: string;
  userId?: string;
  created?: { gte?: Date; lte?: Date } | undefined;
}

export class BookingService {
  static async list(p: BookingListParams): Promise<ServiceResponse> {
    const where: Prisma.BookingWhereInput = {};
    if (p.status) where.status = p.status;
    if (p.paymentStatus) where.payment_status = p.paymentStatus;
    if (p.userId) where.OR = [{ mentor_id: Number(p.userId) }, { user_id: Number(p.userId) }];
    if (p.created) where.created_at = p.created;

    const [rows, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        include: {
          mentor: { select: userCardSelect },
          user: { select: userCardSelect },
        },
        orderBy: { scheduled_at: 'desc' },
        skip: p.skip,
        take: p.limit,
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
    return { success: true, message: 'OK', data: paginated(items, total, p.page, p.limit) };
  }

  static async getOne(uniqueId: string): Promise<ServiceResponse> {
    const b = await prisma.booking.findUnique({
      where: { unique_id: uniqueId },
      include: {
        mentor: { select: userCardSelect },
        user: { select: userCardSelect },
        activities: { orderBy: { created_at: 'desc' }, include: { actor: { select: userCardSelect } } },
        billing_transaction: true,
      },
    });
    if (!b) return { success: false, message: 'Booking not found', statusCode: 404 };

    return {
      success: true,
      message: 'OK',
      data: {
        ...b,
        amount: Number(b.amount),
        platform_fee: b.platform_fee != null ? Number(b.platform_fee) : null,
        mentor: userCard(b.mentor),
        user: userCard(b.user),
        activities: b.activities.map((a) => ({
          id: a.id,
          action: a.action,
          reason: a.reason,
          remark: a.remark,
          created_at: a.created_at,
          actor: userCard((a as any).actor),
        })),
      },
    };
  }

  static async updateStatus(
    id: number,
    body: { status?: unknown; reason?: unknown },
    adminId: number
  ): Promise<ServiceResponse> {
    const status = body.status as string | undefined;
    const reason = body.reason as string | undefined;
    if (!status) return { success: false, message: 'status is required', statusCode: 400 };

    const data: Prisma.BookingUpdateInput = { status };
    if (status === 'CANCELLED') {
      data.cancelled_at = new Date();
      data.cancelled_by = adminId;
    }

    const b = await prisma.booking.update({ where: { id }, data });
    await prisma.bookingActivity.create({
      data: { booking_id: id, action: status, reason: reason ?? null, remark: 'By admin', acted_by: adminId },
    }).catch(() => undefined);

    return { success: true, message: 'Booking status updated', data: { id: b.id, status: b.status } };
  }
}
