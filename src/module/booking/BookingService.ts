import { prisma } from '@services/prismaService';
import { ServiceResponse } from '@utils/ApiResponse';
import { Log } from '@services/loggerService';
import { getUserFullName } from '@utils/General';
import { dispatch } from '@queues/Queue';
import { NotificationJob } from '../../jobs/NotificationJob';
import { NotificationEmailJob } from '../../jobs/NotificationEmailJob';
import { appConfig } from '@config/app';
import { BillingService } from '../billing/BillingService';
import { ConversationService } from '../chat/ConversationService';

const DURATION_MAP: Record<string, number> = {
  '15m': 15, '30m': 30, '45m': 45, '1 hr': 60,
  '1h 15m': 75, '1h 30m': 90, '1h 45m': 105, '2h': 120,
};

/** Minimum gap before a booking can be scheduled (2 hours 15 minutes). */
const MIN_ADVANCE_MS = (2 * 60 + 15) * 60 * 1000;

export class BookingService {
  /**
   * Create a PENDING booking request.
   */
  static async createBooking(
    userId: number,
    data: {
      mentorUniqueId: string;
      duration: number;
      scheduledAt: string;
      message?: string;
      rescheduleFromId?: string;
    }
  ): Promise<ServiceResponse> {
    try {
      const mentor = await prisma.user.findFirst({
        where: { unique_id: data.mentorUniqueId, role: 'mentor', status: 1 },
        select: { id: true, first_name: true, last_name: true },
      });
      if (!mentor) return { success: false, message: 'Mentor not found' };
      if (mentor.id === userId) return { success: false, message: 'You cannot book yourself' };

      // Fetch on-request settings
      const settings = await (prisma as any).mentorOnRequest.findUnique({ where: { user_id: mentor.id } });
      if (!settings || !settings.is_available) {
        return { success: false, message: 'This mentor is not currently accepting bookings' };
      }

      // Validate duration within mentor's range
      const minDur = settings.session_duration_min ?? 15;
      const maxDur = settings.session_duration_max ?? 120;
      if (data.duration < minDur || data.duration > maxDur) {
        return { success: false, message: `Duration must be between ${minDur} and ${maxDur} minutes` };
      }

      // Validate scheduled time is at least 2h15m from now
      const scheduledAt = new Date(data.scheduledAt);
      if (isNaN(scheduledAt.getTime())) {
        return { success: false, message: 'Invalid scheduled date/time' };
      }
      if (scheduledAt.getTime() - Date.now() < MIN_ADVANCE_MS) {
        return { success: false, message: 'Booking must be at least 2 hours 15 minutes from now' };
      }

      // Check for overlapping booking (ignore PENDING bookings older than 2 min — they're stale)
      const staleThreshold = new Date(Date.now() - 2 * 60 * 1000);
      const endTime = new Date(scheduledAt.getTime() + data.duration * 60 * 1000);
      const overlap = await (prisma as any).booking.findFirst({
        where: {
          mentor_id: mentor.id,
          OR: [
            { status: 'CONFIRMED' },
            { status: 'PENDING', created_at: { gt: staleThreshold } },
          ],
          scheduled_at: { lt: endTime },
          AND: {
            scheduled_at: {
              gte: new Date(scheduledAt.getTime() - maxDur * 60 * 1000),
            },
          },
        },
      });
      if (overlap) {
        return { success: false, message: 'This time slot is not available' };
      }

      // Compute amount — pro-rate hourly rate by duration
      let hourlyRate = settings.price_amount != null ? Number(settings.price_amount) : 0;
      if (
        settings.discount_enabled &&
        settings.discount_percent > 0 &&
        (!settings.discount_available_till || new Date(settings.discount_available_till) > new Date())
      ) {
        hourlyRate = Math.round(hourlyRate * (1 - settings.discount_percent / 100) * 100) / 100;
      }
      const amount = Math.round((hourlyRate / 60) * data.duration * 100) / 100;

      // Handle reschedule: cancel old booking and link
      let parentId: number | null = null;
      if (data.rescheduleFromId) {
        const oldBooking = await (prisma as any).booking.findFirst({
          where: { unique_id: data.rescheduleFromId, OR: [{ mentor_id: mentor.id, user_id: userId }, { user_id: userId, mentor_id: mentor.id }] },
        });
        if (!oldBooking) return { success: false, message: 'Original booking not found' };
        if (oldBooking.status === 'CANCELLED') return { success: false, message: 'Original booking is already cancelled' };

        // Must be at least 15 min before scheduled time to reschedule
        const minsUntil = (new Date(oldBooking.scheduled_at).getTime() - Date.now()) / 60000;
        if (minsUntil < 15) {
          return { success: false, message: 'Cannot reschedule less than 15 minutes before the call' };
        }

        await (prisma as any).booking.update({
          where: { id: oldBooking.id },
          data: { status: 'CANCELLED', cancelled_by: userId, cancel_reason: 'Rescheduled' },
        });
        parentId = oldBooking.id;
      }

      const booking = await (prisma as any).booking.create({
        data: {
          mentor_id: mentor.id,
          user_id: userId,
          title: '1:1 Video Call',
          duration: data.duration,
          scheduled_at: scheduledAt,
          message: data.message?.trim() || null,
          amount,
          currency_id: 1, // INR default
          ...(parentId ? { parent_id: parentId, is_reschedule: true, rescheduled_by: userId } : {}),
        },
      });

      // No notifications/email/chat here — triggered only after payment in verifyPayment

      return {
        success: true,
        message: 'Booking request created',
        data: { booking: { unique_id: booking.unique_id, status: booking.status } },
      };
    } catch (error: any) {
      Log.error('Create booking error', { error });
      return { success: false, message: error.message || 'Failed to create booking' };
    }
  }

  /**
   * Create a Razorpay order for a pending booking.
   */
  static async createOrder(userId: number, bookingUniqueId: string): Promise<ServiceResponse> {
    try {
      const booking = await (prisma as any).booking.findFirst({
        where: { unique_id: bookingUniqueId, user_id: userId },
      });
      if (!booking) return { success: false, message: 'Booking not found' };
      if (booking.status !== 'PENDING') return { success: false, message: 'Booking is not in pending state' };
      if (booking.payment_status !== 'UNPAID') return { success: false, message: 'Payment already initiated' };

      // Expire stale PENDING bookings (older than 2 minutes)
      const ageMs = Date.now() - new Date(booking.created_at).getTime();
      if (ageMs > 2 * 60 * 1000) {
        await (prisma as any).booking.update({
          where: { id: booking.id },
          data: { status: 'CANCELLED', cancel_reason: 'Payment timeout' },
        });
        return { success: false, message: 'Booking expired. Please create a new booking.' };
      }

      const baseAmount = Number(booking.amount);
      if (baseAmount <= 0) return { success: false, message: 'Invalid booking amount' };

      // Platform fee + GST — same constants as frontend checkout
      const PLATFORM_FEE_PERCENT = 5;
      const GST_PERCENT = 18;
      const platformFee = Math.round(baseAmount * PLATFORM_FEE_PERCENT) / 100;
      const gstOnFee = Math.round(platformFee * GST_PERCENT) / 100;
      const totalAmount = baseAmount + platformFee + gstOnFee;
      const platformTransferPaise = Math.round((platformFee + gstOnFee) * 100);

      // Store platform fee on booking
      await (prisma as any).booking.update({
        where: { id: booking.id },
        data: { platform_fee: platformFee + gstOnFee },
      });

      const result = await BillingService.createVerificationOrder(String(userId), totalAmount, {
        receiptPrefix: 'booking',
        platformTransferAmountPaise: platformTransferPaise,
        notes: { purpose: 'mentor_booking', booking_id: String(booking.id), user_id: String(userId) },
      });

      if (!result.success) return { success: false, message: (result as any).message || 'Failed to create order' };

      // Store order ID on booking
      await (prisma as any).booking.update({
        where: { id: booking.id },
        data: { razorpay_order_id: result.data!.orderId },
      });

      return {
        success: true,
        message: 'Order created',
        data: result.data,
      };
    } catch (error: any) {
      Log.error('Create booking order error', { error });
      return { success: false, message: error.message || 'Failed to create order' };
    }
  }

  /**
   * Verify Razorpay payment and confirm booking.
   */
  static async verifyPayment(
    userId: number,
    bookingUniqueId: string,
    data: { razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string }
  ): Promise<ServiceResponse> {
    try {
      const booking = await (prisma as any).booking.findFirst({
        where: { unique_id: bookingUniqueId, user_id: userId },
        include: { mentor: { select: { id: true, first_name: true, last_name: true } } },
      });
      if (!booking) return { success: false, message: 'Booking not found' };
      if (booking.payment_status !== 'UNPAID') return { success: false, message: 'Payment already processed' };

      const isValid = BillingService.verifyPaymentSignature(data);
      if (!isValid) return { success: false, message: 'Payment verification failed' };

      // Update booking
      await (prisma as any).booking.update({
        where: { id: booking.id },
        data: {
          status: 'CONFIRMED',
          payment_status: 'PAID',
          meta: {
            razorpay_order_id: data.razorpayOrderId,
            razorpay_payment_id: data.razorpayPaymentId,
          },
        },
      });

      // Notify mentor — only after successful payment
      const userName = await getUserFullName(userId);
      const isReschedule = booking.is_reschedule;
      const notifTitle = isReschedule ? 'Booking rescheduled' : 'New booking confirmed';
      const notifBody = isReschedule
        ? `${userName} rescheduled and paid for a ${booking.duration}-minute call.`
        : `${userName} booked and paid for a ${booking.duration}-minute call.`;
      const notifData = {
        userId: booking.mentor_id,
        type: 'BOOKING_CONFIRMED' as const,
        notificationTitle: notifTitle,
        notificationBody: notifBody,
        notificationLink: `${appConfig.frontendUrl}/my-bookings`,
        actorId: userId,
        subjectType: 'Booking' as const,
        subjectId: booking.id,
      };
      await dispatch(NotificationJob, notifData);
      await dispatch(NotificationEmailJob, notifData);

      // Sync to chat
      const bDate = new Date(booking.scheduled_at);
      const bDateStr = bDate.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });
      const bTimeStr = bDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
      const chatPrefix = isReschedule ? '📅 Booking rescheduled & confirmed!' : '✅ New booking confirmed!';
      await ConversationService.syncSystemMessage(
        userId, booking.mentor_id,
        `${chatPrefix} Payment received.\n\n1:1 Video Call · ${booking.duration} mins\n${bDateStr} at ${bTimeStr}${booking.message ? `\n\nDiscussion: ${booking.message}` : ''}`,
        { activityType: 'BOOKING_CONFIRMED' },
        undefined, userId
      );

      return {
        success: true,
        message: 'Payment verified and booking confirmed',
        data: { booking: { unique_id: booking.unique_id, status: 'CONFIRMED' } },
      };
    } catch (error: any) {
      Log.error('Verify booking payment error', { error });
      return { success: false, message: error.message || 'Failed to verify payment' };
    }
  }

  /**
   * List bookings for a user (as mentor or as booker).
   */
  static async listBookings(
    userId: number,
    opts: { role?: 'mentor' | 'user'; status?: string; limit?: number; cursor?: string } = {}
  ): Promise<ServiceResponse> {
    try {
      const limit = Math.min(opts.limit ?? 16, 50);
      const cursorDate = opts.cursor ? new Date(opts.cursor) : null;

      const where: any = {
        status: { notIn: ['PENDING', 'CANCELLED'] },
      };
      if (opts.role === 'mentor') {
        where.mentor_id = userId;
      } else {
        where.user_id = userId;
      }
      if (opts.status) {
        where.status = opts.status;
      }
      if (cursorDate) {
        where.created_at = { lt: cursorDate };
      }

      const rows = await (prisma as any).booking.findMany({
        where,
        take: limit + 1,
        orderBy: { created_at: 'desc' },
        include: {
          mentor: {
            select: {
              id: true, unique_id: true, first_name: true, last_name: true,
              personalInfo: { select: { profileImage: true } },
            },
          },
          user: {
            select: {
              id: true, unique_id: true, first_name: true, last_name: true,
              personalInfo: { select: { profileImage: true } },
            },
          },
          currency: { select: { code: true, symbol: true } },
        },
      });

      const hasMore = rows.length > limit;
      const slice = hasMore ? rows.slice(0, limit) : rows;

      const bookings = slice.map((b: any) => ({
        uniqueId: b.unique_id,
        title: b.title,
        description: b.description,
        duration: b.duration,
        scheduledAt: b.scheduled_at,
        message: b.message,
        status: b.status,
        paymentStatus: b.payment_status,
        amount: Number(b.amount),
        currency: b.currency?.code || 'INR',
        currencySymbol: b.currency?.symbol || '₹',
        isReschedule: b.is_reschedule,
        parentId: b.parent_id,
        createdAt: b.created_at,
        mentor: {
          uniqueId: b.mentor.unique_id,
          firstName: b.mentor.first_name,
          lastName: b.mentor.last_name,
          profileImage: b.mentor.personalInfo?.profileImage || null,
        },
        user: {
          uniqueId: b.user.unique_id,
          firstName: b.user.first_name,
          lastName: b.user.last_name,
          profileImage: b.user.personalInfo?.profileImage || null,
        },
      }));

      const nextCursor = hasMore && slice.length > 0
        ? slice[slice.length - 1].created_at.toISOString()
        : null;

      return {
        success: true,
        message: 'Bookings fetched',
        data: { bookings, nextCursor, hasMore },
      };
    } catch (error: any) {
      Log.error('List bookings error', { error });
      return { success: false, message: error.message || 'Failed to fetch bookings' };
    }
  }

  /**
   * Get a single booking by unique_id.
   */
  static async getBookingById(userId: number, uniqueId: string): Promise<ServiceResponse> {
    try {
      const booking = await (prisma as any).booking.findFirst({
        where: {
          unique_id: uniqueId,
          OR: [{ mentor_id: userId }, { user_id: userId }],
        },
        include: {
          mentor: {
            select: {
              id: true, unique_id: true, first_name: true, last_name: true,
              personalInfo: { select: { profileImage: true, title: true } },
            },
          },
          user: {
            select: {
              id: true, unique_id: true, first_name: true, last_name: true,
              personalInfo: { select: { profileImage: true } },
            },
          },
          currency: { select: { code: true, symbol: true } },
        },
      });
      if (!booking) return { success: false, message: 'Booking not found' };

      return {
        success: true,
        message: 'Booking fetched',
        data: {
          uniqueId: booking.unique_id,
          title: booking.title,
          description: booking.description,
          duration: booking.duration,
          scheduledAt: booking.scheduled_at,
          message: booking.message,
          status: booking.status,
          paymentStatus: booking.payment_status,
          amount: Number(booking.amount),
          currency: booking.currency?.code || 'INR',
          currencySymbol: booking.currency?.symbol || '₹',
          platformFee: booking.platform_fee ? Number(booking.platform_fee) : null,
          isReschedule: booking.is_reschedule,
          parentId: booking.parent_id,
          createdAt: booking.created_at,
          mentor: {
            uniqueId: booking.mentor.unique_id,
            firstName: booking.mentor.first_name,
            lastName: booking.mentor.last_name,
            profileImage: booking.mentor.personalInfo?.profileImage || null,
            tagline: booking.mentor.personalInfo?.title || null,
          },
          user: {
            uniqueId: booking.user.unique_id,
            firstName: booking.user.first_name,
            lastName: booking.user.last_name,
            profileImage: booking.user.personalInfo?.profileImage || null,
          },
        },
      };
    } catch (error: any) {
      Log.error('Get booking error', { error });
      return { success: false, message: error.message || 'Failed to fetch booking' };
    }
  }

  /**
   * Cancel a booking. Both mentor and user can cancel.
   */
  static async cancelBooking(
    userId: number,
    uniqueId: string,
    reason?: string
  ): Promise<ServiceResponse> {
    try {
      const booking = await (prisma as any).booking.findFirst({
        where: {
          unique_id: uniqueId,
          OR: [{ mentor_id: userId }, { user_id: userId }],
        },
        include: {
          mentor: { select: { id: true, first_name: true, last_name: true } },
          user: { select: { id: true, first_name: true, last_name: true } },
        },
      });
      if (!booking) return { success: false, message: 'Booking not found' };
      if (booking.status === 'CANCELLED') return { success: false, message: 'Booking is already cancelled' };
      if (booking.status === 'COMPLETED') return { success: false, message: 'Cannot cancel a completed booking' };

      await (prisma as any).booking.update({
        where: { id: booking.id },
        data: {
          status: 'CANCELLED',
          cancelled_by: userId,
          cancel_reason: reason?.trim() || null,
        },
      });

      // Notify the other party
      const otherUserId = userId === booking.mentor_id ? booking.user_id : booking.mentor_id;
      const cancellerName = await getUserFullName(userId);
      const notifData = {
        userId: otherUserId,
        type: 'BOOKING_CANCELLED' as const,
        notificationTitle: 'Booking cancelled',
        notificationBody: `${cancellerName} cancelled the ${booking.duration}-minute call.`,
        notificationLink: `${appConfig.frontendUrl}/my-bookings`,
        actorId: userId,
        subjectType: 'Booking' as const,
        subjectId: booking.id,
      };
      await dispatch(NotificationJob, notifData);
      await dispatch(NotificationEmailJob, notifData);

      // Sync to chat
      const cDate = new Date(booking.scheduled_at);
      const cDateStr = cDate.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });
      const cTimeStr = cDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
      await ConversationService.syncSystemMessage(
        booking.user_id, booking.mentor_id,
        `❌ ${cancellerName} cancelled the call.\n\n1:1 Video Call · ${booking.duration} mins\n${cDateStr} at ${cTimeStr}${reason ? `\n\nReason: ${reason.trim()}` : ''}`,
        { activityType: 'BOOKING_CANCELLED' },
        undefined, userId
      );

      return { success: true, message: 'Booking cancelled' };
    } catch (error: any) {
      Log.error('Cancel booking error', { error });
      return { success: false, message: error.message || 'Failed to cancel booking' };
    }
  }
}
