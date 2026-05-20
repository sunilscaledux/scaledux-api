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
import { MeetingService } from '../video-conferencing/MeetingService';

const DURATION_MAP: Record<string, number> = {
  '15m': 15, '30m': 30, '45m': 45, '1 hr': 60,
  '1h 15m': 75, '1h 30m': 90, '1h 45m': 105, '2h': 120,
};

/** Minimum gap before a booking can be scheduled (2 hours 15 minutes). */
const MIN_ADVANCE_MS = (2 * 60 + 15) * 60 * 1000;

/** Format a date for notification text (email/DB). */
function formatNotifDate(date: Date): string {
  const d = new Intl.DateTimeFormat('en-US', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' }).format(date);
  const t = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).format(date);
  return `${d} at ${t}`;
}

/** Escape HTML special characters to prevent XSS in email templates. */
function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Build HTML notification body for booking emails. */
function buildBookingEmailBody(params: {
  userName: string;
  duration: number;
  scheduledAt: Date;
  isReschedule?: boolean;
  message?: string | null;
  cancelledBy?: string;
  cancelReason?: string | null;
  type: 'confirmed' | 'cancelled';
  /** 'mentor' = email goes to mentor, 'user' = email goes to user/founder */
  recipientRole?: 'mentor' | 'user';
}): string {
  const { userName, duration, scheduledAt, isReschedule, message, cancelledBy, cancelReason, type, recipientRole = 'mentor' } = params;
  const dateStr = formatNotifDate(scheduledAt);

  const lines: string[] = [];

  if (type === 'confirmed') {
    if (recipientRole === 'user') {
      lines.push(isReschedule
        ? `<p>Your 1:1 video call with <strong>${escapeHtml(userName)}</strong> has been rescheduled and confirmed.</p>`
        : `<p>Your 1:1 video call with <strong>${escapeHtml(userName)}</strong> has been confirmed. Payment received.</p>`
      );
    } else {
      lines.push(isReschedule
        ? `<p><strong>${escapeHtml(userName)}</strong> has rescheduled their 1:1 video call with you.</p>`
        : `<p><strong>${escapeHtml(userName)}</strong> has booked a 1:1 video call with you. Payment has been received.</p>`
      );
    }
  } else {
    lines.push(`<p><strong>${escapeHtml(cancelledBy || userName)}</strong> has cancelled the 1:1 video call.</p>`);
  }

  lines.push(`<table style="border-collapse:collapse;margin:16px 0;width:100%;max-width:480px;">
    <tr><td style="padding:8px 0;color:#667085;font-size:14px;">Call type</td><td style="padding:8px 0;font-weight:600;font-size:14px;">1:1 Video Call</td></tr>
    <tr><td style="padding:8px 0;color:#667085;font-size:14px;">Duration</td><td style="padding:8px 0;font-weight:600;font-size:14px;">${duration} minutes</td></tr>
    <tr><td style="padding:8px 0;color:#667085;font-size:14px;">Scheduled</td><td style="padding:8px 0;font-weight:600;font-size:14px;">${escapeHtml(dateStr)}</td></tr>
  </table>`);

  if (message) {
    lines.push(`<div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px 16px;margin:12px 0;">
      <p style="margin:0 0 4px;font-weight:600;font-size:13px;color:#344054;">Discussion points</p>
      <div style="margin:0;font-size:13px;color:#667085;">${message}</div>
    </div>`);
  }

  if (cancelReason) {
    lines.push(`<p style="font-size:13px;color:#667085;"><strong>Reason:</strong> ${escapeHtml(cancelReason)}</p>`);
  }

  return lines.join('');
}

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
      if (mentor.id === userId && !data.rescheduleFromId) return { success: false, message: 'You cannot book yourself' };

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

      // Check for overlapping booking using scheduled_end (ignore stale PENDING > 3 min)
      const staleThreshold = new Date(Date.now() - 3 * 60 * 1000);
      const newEnd = new Date(scheduledAt.getTime() + data.duration * 60 * 1000);

      // Two bookings overlap when: existingStart < newEnd AND existingEnd > newStart
      const overlap = await (prisma as any).booking.findFirst({
        where: {
          mentor_id: mentor.id,
          scheduled_at: { lt: newEnd },        // existing starts before new ends
          scheduled_end: { gt: scheduledAt },   // existing ends after new starts
          OR: [
            { status: 'CONFIRMED' },
            { status: 'PENDING', created_at: { gt: staleThreshold } },
          ],
        },
        select: { id: true },
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
      let bookingUserId = userId; // the founder who booked
      if (data.rescheduleFromId) {
        const oldBooking = await (prisma as any).booking.findFirst({
          where: { unique_id: data.rescheduleFromId, OR: [{ user_id: userId }, { mentor_id: userId }] },
        });
        if (!oldBooking) return { success: false, message: 'Original booking not found' };
        if (oldBooking.status === 'CANCELLED') return { success: false, message: 'Original booking is already cancelled' };

        // Must be at least 1 hour before scheduled time to reschedule
        const minsUntil = (new Date(oldBooking.scheduled_at).getTime() - Date.now()) / 60000;
        if (minsUntil < 60) {
          return { success: false, message: 'Cannot reschedule less than 1 hour before the call' };
        }

        await (prisma as any).booking.update({
          where: { id: oldBooking.id },
          data: { status: 'CANCELLED', cancelled_by: userId, cancel_reason: 'Rescheduled' },
        });
        parentId = oldBooking.id;
        // Preserve original booking's user (founder) — mentor may be the one rescheduling
        bookingUserId = oldBooking.user_id;
      }

      const scheduledEnd = new Date(scheduledAt.getTime() + data.duration * 60 * 1000);

      const isReschedule = !!parentId;

      const booking = await (prisma as any).booking.create({
        data: {
          mentor_id: mentor.id,
          user_id: bookingUserId,
          title: '1:1 Video Call',
          duration: data.duration,
          scheduled_at: scheduledAt,
          scheduled_end: scheduledEnd,
          message: data.message?.trim() || null,
          amount,
          currency_id: 1, // INR default
          ...(isReschedule
            ? { parent_id: parentId, is_reschedule: true, rescheduled_by: userId, status: 'CONFIRMED', payment_status: 'PAID' }
            : {}),
        },
      });

      // Reschedule: auto-confirm (no payment needed) and send notifications to both parties
      if (isReschedule) {
        const reschedulerName = await getUserFullName(userId);
        const mentorName = `${mentor.first_name} ${mentor.last_name}`.trim();
        const isMentorRescheduling = userId === mentor.id;

        // Notify mentor (skip if mentor is the one rescheduling)
        if (!isMentorRescheduling) {
          const mentorNotifBody = buildBookingEmailBody({
            userName: reschedulerName,
            duration: booking.duration,
            scheduledAt: new Date(booking.scheduled_at),
            isReschedule: true,
            message: booking.message,
            type: 'confirmed',
          });
          const mentorNotifData = {
            userId: mentor.id,
            type: 'BOOKING_CONFIRMED' as const,
            notificationTitle: 'Call rescheduled & confirmed',
            notificationBody: mentorNotifBody,
            notificationLink: `${appConfig.frontendUrl}/my-bookings`,
            actorId: userId,
            subjectType: 'Booking' as const,
            subjectId: booking.id,
          };
          await dispatch(NotificationJob, mentorNotifData);
          await dispatch(NotificationEmailJob, mentorNotifData);
        }

        // Notify user (founder) — skip if founder is the one rescheduling
        if (isMentorRescheduling || bookingUserId !== userId) {
          const userNotifBody = buildBookingEmailBody({
            userName: isMentorRescheduling ? mentorName : reschedulerName,
            duration: booking.duration,
            scheduledAt: new Date(booking.scheduled_at),
            isReschedule: true,
            message: booking.message,
            type: 'confirmed',
            recipientRole: 'user',
          });
          const userNotifData = {
            userId: bookingUserId,
            type: 'BOOKING_CONFIRMED' as const,
            notificationTitle: 'Call rescheduled & confirmed',
            notificationBody: userNotifBody,
            notificationLink: `${appConfig.frontendUrl}/my-bookings`,
            actorId: userId,
            subjectType: 'Booking' as const,
            subjectId: booking.id,
          };
          await dispatch(NotificationJob, userNotifData);
          await dispatch(NotificationEmailJob, userNotifData);
        }

        await ConversationService.syncSystemMessage(
          bookingUserId, mentor.id,
          '📅 Booking rescheduled & confirmed!',
          {
            activityType: 'BOOKING_CONFIRMED',
            bookingTitle: '1:1 Video Call',
            bookingDuration: booking.duration,
            bookingScheduledAt: booking.scheduled_at,
            bookingMessage: booking.message || null,
          },
          undefined, userId
        );

        return {
          success: true,
          message: 'Booking rescheduled and confirmed',
          data: { booking: { unique_id: booking.unique_id, status: 'CONFIRMED', isReschedule: true } },
        };
      }

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

      // Notify both mentor and user after successful payment
      const userName = await getUserFullName(userId);
      const mentorName = `${booking.mentor.first_name} ${booking.mentor.last_name}`.trim();
      const isReschedule = booking.is_reschedule;

      // Notify mentor
      const mentorNotifTitle = isReschedule ? 'Call rescheduled & confirmed' : '1:1 Call booked';
      const mentorNotifBody = buildBookingEmailBody({
        userName,
        duration: booking.duration,
        scheduledAt: new Date(booking.scheduled_at),
        isReschedule,
        message: booking.message,
        type: 'confirmed',
      });
      const mentorNotifData = {
        userId: booking.mentor_id,
        type: 'BOOKING_CONFIRMED' as const,
        notificationTitle: mentorNotifTitle,
        notificationBody: mentorNotifBody,
        notificationLink: `${appConfig.frontendUrl}/my-bookings`,
        actorId: userId,
        subjectType: 'Booking' as const,
        subjectId: booking.id,
      };
      await dispatch(NotificationJob, mentorNotifData);
      await dispatch(NotificationEmailJob, mentorNotifData);

      // Notify user (founder)
      const userNotifTitle = isReschedule ? 'Call rescheduled & confirmed' : 'Booking confirmed';
      const userNotifBody = buildBookingEmailBody({
        userName: mentorName,
        duration: booking.duration,
        scheduledAt: new Date(booking.scheduled_at),
        isReschedule,
        message: booking.message,
        type: 'confirmed',
        recipientRole: 'user',
      });
      const userNotifData = {
        userId,
        type: 'BOOKING_CONFIRMED' as const,
        notificationTitle: userNotifTitle,
        notificationBody: userNotifBody,
        notificationLink: `${appConfig.frontendUrl}/my-bookings`,
        actorId: booking.mentor_id,
        subjectType: 'Booking' as const,
        subjectId: booking.id,
      };
      await dispatch(NotificationJob, userNotifData);
      await dispatch(NotificationEmailJob, userNotifData);

      // Sync to chat — pass raw data in metadata, frontend formats with user's local tz
      const chatPrefix = isReschedule ? '📅 Booking rescheduled & confirmed!' : '✅ New booking confirmed!';
      await ConversationService.syncSystemMessage(
        userId, booking.mentor_id,
        `${chatPrefix} Payment received.`,
        {
          activityType: 'BOOKING_CONFIRMED',
          bookingTitle: '1:1 Video Call',
          bookingDuration: booking.duration,
          bookingScheduledAt: booking.scheduled_at,
          bookingMessage: booking.message || null,
        },
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
        status: { notIn: ['PENDING'] },
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
        meetingLink: b.meeting_link ?? null,
        meetingProvider: b.meeting_provider ?? null,
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
          meetingLink: booking.meeting_link ?? null,
          meetingProvider: booking.meeting_provider ?? null,
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
        notificationTitle: '1:1 Call cancelled',
        notificationBody: buildBookingEmailBody({
          userName: cancellerName,
          duration: booking.duration,
          scheduledAt: new Date(booking.scheduled_at),
          cancelledBy: cancellerName,
          cancelReason: reason?.trim(),
          type: 'cancelled',
        }),
        notificationLink: `${appConfig.frontendUrl}/my-bookings`,
        actorId: userId,
        subjectType: 'Booking' as const,
        subjectId: booking.id,
      };
      await dispatch(NotificationJob, notifData);
      await dispatch(NotificationEmailJob, notifData);

      // Sync to chat — raw data in metadata, frontend formats
      await ConversationService.syncSystemMessage(
        booking.user_id, booking.mentor_id,
        `❌ ${cancellerName} cancelled the call.`,
        {
          activityType: 'BOOKING_CANCELLED',
          bookingTitle: '1:1 Video Call',
          bookingDuration: booking.duration,
          bookingScheduledAt: booking.scheduled_at,
          cancelReason: reason?.trim() || null,
        },
        undefined, userId
      );

      return { success: true, message: 'Booking cancelled' };
    } catch (error: any) {
      Log.error('Cancel booking error', { error });
      return { success: false, message: error.message || 'Failed to cancel booking' };
    }
  }

  /**
   * Get occupied time ranges for a mentor on a given date.
   * Returns array of { start (minutes since midnight), end (minutes since midnight) }.
   * Used by frontend to disable booked slots.
   */
  static async getOccupiedSlots(
    mentorUniqueId: string,
    date: string // YYYY-MM-DD
  ): Promise<ServiceResponse> {
    try {
      const mentor = await prisma.user.findFirst({
        where: { unique_id: mentorUniqueId, role: 'mentor' },
        select: { id: true },
      });
      if (!mentor) return { success: false, message: 'Mentor not found' };

      // Parse date as server-local start/end of day (matches frontend's local date)
      const [y, m, d] = date.split('-').map(Number);
      const dayStart = new Date(y, m - 1, d, 0, 0, 0);
      const dayEnd = new Date(y, m - 1, d, 23, 59, 59);

      const staleThreshold = new Date(Date.now() - 3 * 60 * 1000);

      const bookings = await (prisma as any).booking.findMany({
        where: {
          mentor_id: mentor.id,
          // Any booking that overlaps with this day
          scheduled_at: { lte: dayEnd },
          scheduled_end: { gte: dayStart },
          OR: [
            { status: 'CONFIRMED' },
            { status: 'PENDING', created_at: { gt: staleThreshold } },
          ],
        },
        select: { scheduled_at: true, scheduled_end: true },
      });

      // Dates are auto-serialized to ISO strings by Express res.json()
      const occupiedSlots = bookings.map((b: any) => ({
        start: b.scheduled_at,
        end: b.scheduled_end,
      }));

      // Fetch mentor's availability schedule
      const avail = await (prisma as any).availability.findUnique({
        where: { user_id: mentor.id },
      });

      // Get the day name for the requested date (lowercase)
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayOfWeek = dayNames[dayStart.getDay()];

      // Check if date is in unavailability list
      const unavailDates: string[] = avail?.unavailability ?? [];
      const isUnavailable = unavailDates.includes(date);

      // Get available time windows for this day
      // null = no availability configured (show default 9-6), [] = day has no schedule (show nothing)
      let availableWindows: Array<{ from: string; to: string }> | null = null;
      if (avail) {
        const schedule: Array<{ day: string; time: Array<{ from: string; to: string }> }> = avail.schedule ?? [];
        const daySchedule = schedule.find((s: any) => s.day.toLowerCase() === dayOfWeek);
        availableWindows = (!isUnavailable && daySchedule) ? daySchedule.time : [];
      }

      return {
        success: true,
        message: 'Slots fetched',
        data: {
          slots: occupiedSlots,
          availableWindows, // [{ from: "09:00", to: "17:00" }]
          isUnavailable,
          restBreak: avail?.rest_break ?? null,
        },
      };
    } catch (error: any) {
      Log.error('Get occupied slots error', { error });
      return { success: false, message: error.message || 'Failed to fetch slots' };
    }
  }

  /**
   * Add a meeting link to a confirmed booking (mentor action).
   * Generates a link via OAuth provider or accepts a manual URL.
   * Sends notification + email to the user and syncs to chat.
   */
  static async addMeetingLink(
    mentorId: number,
    bookingUniqueId: string,
    data: { provider: 'zoom' | 'google_meet' | 'ms_teams' | 'manual'; manualLink?: string }
  ): Promise<ServiceResponse> {
    try {
      const booking = await (prisma as any).booking.findFirst({
        where: { unique_id: bookingUniqueId, mentor_id: mentorId },
        include: {
          mentor: { select: { id: true, first_name: true, last_name: true } },
          user: { select: { id: true, first_name: true, last_name: true } },
        },
      });
      if (!booking) return { success: false, message: 'Booking not found' };
      if (booking.status !== 'CONFIRMED') return { success: false, message: 'Only confirmed bookings can have a meeting link' };

      const isUpdate = !!booking.meeting_link;
      let meetingLink: string;
      let meetingProvider: string;

      if (data.provider === 'manual') {
        if (!data.manualLink || !data.manualLink.startsWith('https://')) {
          return { success: false, message: 'A valid HTTPS meeting link is required' };
        }
        meetingLink = data.manualLink.trim();
        meetingProvider = 'manual';
      } else {
        const result = await MeetingService.generateMeetingLink(mentorId, data.provider, {
          title: booking.title,
          scheduledAt: new Date(booking.scheduled_at),
          duration: booking.duration,
        });
        meetingLink = result.link;
        meetingProvider = result.provider;
      }

      await (prisma as any).booking.update({
        where: { id: booking.id },
        data: { meeting_link: meetingLink, meeting_provider: meetingProvider },
      });

      // Notify the user (mentee) about the meeting link
      const mentorName = `${booking.mentor.first_name} ${booking.mentor.last_name}`.trim();
      const dateStr = formatNotifDate(new Date(booking.scheduled_at));
      const actionWord = isUpdate ? 'updated' : 'added';
      const notifBody = `<p><strong>${escapeHtml(mentorName)}</strong> has ${actionWord} the meeting link for your upcoming 1:1 video call on <strong>${escapeHtml(dateStr)}</strong>.</p>
        <table style="border-collapse:collapse;margin:16px 0;width:100%;max-width:480px;">
          <tr><td style="padding:8px 0;color:#667085;font-size:14px;">Duration</td><td style="padding:8px 0;font-weight:600;font-size:14px;">${booking.duration} minutes</td></tr>
          <tr><td style="padding:8px 0;color:#667085;font-size:14px;">Meeting link</td><td style="padding:8px 0;font-weight:600;font-size:14px;"><a href="${escapeHtml(meetingLink)}" style="color:#7C3AED;">Join meeting</a></td></tr>
        </table>`;

      const notifData = {
        userId: booking.user_id,
        type: 'MEETING_LINK_ADDED' as const,
        notificationTitle: `Meeting link ${actionWord}`,
        notificationBody: notifBody,
        notificationLink: `${appConfig.frontendUrl}/my-bookings`,
        actorId: mentorId,
        subjectType: 'Booking' as const,
        subjectId: booking.id,
      };
      await dispatch(NotificationJob, notifData);
      await dispatch(NotificationEmailJob, notifData);

      // Sync to chat
      await ConversationService.syncSystemMessage(
        booking.user_id, booking.mentor_id,
        `🔗 Meeting link ${actionWord} for the upcoming call.`,
        {
          activityType: 'MEETING_LINK_ADDED',
          bookingTitle: '1:1 Video Call',
          bookingDuration: booking.duration,
          bookingScheduledAt: booking.scheduled_at,
          meetingLink,
          meetingProvider,
        },
        undefined, mentorId
      );

      return {
        success: true,
        message: `Meeting link ${actionWord}`,
        data: { meetingLink, meetingProvider },
      };
    } catch (error: any) {
      Log.error('Add meeting link error', { error });
      return { success: false, message: error.message || 'Failed to add meeting link' };
    }
  }
}
