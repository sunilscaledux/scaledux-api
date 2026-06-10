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
import { GoogleMeetService } from '../video-conferencing/GoogleMeetService';
import { isValidMeetingReason } from '../../constants/meetingReasons';
import { resolveAttachmentUrl } from '@services/attachmentService';
import { calcBookingMentorDeductions, calcBookingMentorPayout, calcBookingFounderTotal } from '@utils/feeCalculations';
import {
  BillingTransactionType,
  BillingTransactionStatus,
  BillingTransactionSenderStatus,
  BillingTransactionReceiverStatus,
} from '../../constants/status';
import Razorpay from 'razorpay';
import razorpayConfig from '@config/razorpay';

let razorpay: any = null;
if (razorpayConfig.key_id && razorpayConfig.key_secret) {
  razorpay = new Razorpay({ key_id: razorpayConfig.key_id, key_secret: razorpayConfig.key_secret });
}

/** Resolve a profileImage attachment key to its public URL (or null if missing). */
async function resolveProfileImage(value: string | null | undefined): Promise<string | null> {
  if (!value) return null;
  const url = await resolveAttachmentUrl(value, 'profile_image');
  return url || null;
}

const DURATION_MAP: Record<string, number> = {
  '15m': 15, '30m': 30, '45m': 45, '1 hr': 60,
  '1h 15m': 75, '1h 30m': 90, '1h 45m': 105, '2h': 120,
};

/** Minimum gap before a booking can be scheduled (2 hours 15 minutes). */
const MIN_ADVANCE_MS = (2 * 60 + 15) * 60 * 1000;

/**
 * Format a date for notification text (email/DB) in IST.
 * The server typically runs in UTC, but bookings are entered in the user's local time (IST for now)
 * — so we format with an explicit timeZone to match what the browser shows on the booking card.
 */
const NOTIF_TZ = 'Asia/Kolkata';
function formatNotifDate(date: Date): string {
  const d = new Intl.DateTimeFormat('en-US', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric', timeZone: NOTIF_TZ }).format(date);
  const t = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: NOTIF_TZ }).format(date);
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
        : `<p>Your 1:1 video call with <strong>${escapeHtml(userName)}</strong> has been confirmed.</p>`
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

/** Build a short plain-text body for in-app notifications. */
function buildBookingInAppBody(params: {
  userName: string;
  duration: number;
  scheduledAt: Date;
  isReschedule?: boolean;
  cancelledBy?: string;
  cancelReason?: string | null;
  type: 'confirmed' | 'cancelled';
}): string {
  const { userName, duration, scheduledAt, isReschedule, cancelledBy, cancelReason, type } = params;
  const dateStr = formatNotifDate(scheduledAt);
  if (type === 'cancelled') {
    const parts = [`${cancelledBy || userName} cancelled the ${duration}-min call scheduled for ${dateStr}.`];
    if (cancelReason) parts.push(`Reason: ${cancelReason}`);
    return parts.join(' ');
  }
  if (isReschedule) {
    return `${userName} rescheduled the call. New time: ${dateStr} (${duration} min).`;
  }
  return `${userName} booked a ${duration}-min 1:1 call on ${dateStr}.`;
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
      rescheduleReason?: string;
      rescheduleRemark?: string;
      wantsRecording?: boolean;
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
      // Exclude the current user's own PENDING bookings so they can re-book the same slot
      const overlap = await (prisma as any).booking.findFirst({
        where: {
          mentor_id: mentor.id,
          scheduled_at: { lt: newEnd },        // existing starts before new ends
          scheduled_end: { gt: scheduledAt },   // existing ends after new starts
          OR: [
            { status: 'CONFIRMED' },
            { status: 'PENDING', created_at: { gt: staleThreshold } },
          ],
          NOT: { user_id: userId, status: 'PENDING' },
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
      const callAmount = Math.round((hourlyRate / 60) * data.duration * 100) / 100;

      // Recording add-on
      const wantsRecording = data.wantsRecording === true && settings.recording_enabled;
      const recordingAmount =
        wantsRecording && settings.recording_type === 'paid' && settings.recording_amount != null
          ? Math.round(Number(settings.recording_amount) * 100) / 100
          : 0;
      const amount = callAmount + recordingAmount;

      // Handle reschedule: update the same booking in place
      if (data.rescheduleFromId) {
        const oldBooking = await (prisma as any).booking.findFirst({
          where: { unique_id: data.rescheduleFromId, OR: [{ user_id: userId }, { mentor_id: userId }] },
        });
        if (!oldBooking) return { success: false, message: 'Original booking not found' };
        if (oldBooking.status === 'CANCELLED') return { success: false, message: 'Original booking is already cancelled' };

        // Mentors can only request a reschedule, not reschedule directly
        if (userId === oldBooking.mentor_id) {
          return { success: false, message: 'Mentors can only request a reschedule. Use the request reschedule option instead.' };
        }

        // Enforce max 2 reschedules
        const rescheduleCount = (oldBooking.reschedule_count || 0) + 1;
        if (rescheduleCount > 2) {
          return { success: false, message: 'This booking has already been rescheduled 2 times. Please create a new booking instead.' };
        }

        // Must be at least 1 hour before scheduled time to reschedule
        const minsUntil = (new Date(oldBooking.scheduled_at).getTime() - Date.now()) / 60000;
        if (minsUntil < 60) {
          return { success: false, message: 'Cannot reschedule less than 1 hour before the call' };
        }

        const scheduledEnd = new Date(scheduledAt.getTime() + data.duration * 60 * 1000);

        const booking = await (prisma as any).booking.update({
          where: { id: oldBooking.id },
          data: {
            scheduled_at: scheduledAt,
            scheduled_end: scheduledEnd,
            duration: data.duration,
            is_reschedule: true,
            rescheduled_by: userId,
            reschedule_count: rescheduleCount,
            reschedule_requested_at: null,
          },
        });

        await (prisma as any).bookingActivity.create({
          data: {
            booking_id: oldBooking.id,
            action: 'RESCHEDULED',
            reason: data.rescheduleReason?.trim() || null,
            remark: data.rescheduleRemark?.trim() || null,
            acted_by: userId,
          },
        });

        // Re-sync the calendar event to the new time (patches the existing
        // event if one was created, else creates it). Best-effort.
        await this.syncBookingToCalendar(booking.id);

        // Send notifications to both parties
        const reschedulerName = await getUserFullName(userId);
        const mentorName = `${mentor.first_name} ${mentor.last_name}`.trim();
        const isMentorRescheduling = userId === mentor.id;
        const bookingUserId = oldBooking.user_id;

        const rescheduleInAppParams = {
          duration: booking.duration,
          scheduledAt: new Date(booking.scheduled_at),
          isReschedule: true as const,
          type: 'confirmed' as const,
        };

        // Notify mentor
        const mentorNotifBody = buildBookingEmailBody({
          userName: reschedulerName,
          ...rescheduleInAppParams,
          message: booking.message,
        });
        const mentorNotifData = {
          userId: mentor.id,
          type: 'BOOKING_CONFIRMED' as const,
          notificationTitle: 'Call rescheduled & confirmed',
          notificationBody: mentorNotifBody,
          inAppBody: buildBookingInAppBody({ userName: reschedulerName, ...rescheduleInAppParams }),
          notificationLink: `${appConfig.frontendUrl}/my-bookings`,
          actorId: userId,
          subjectType: 'Booking' as const,
          subjectId: booking.id,
        };
        await dispatch(NotificationJob, mentorNotifData);
        await dispatch(NotificationEmailJob, mentorNotifData);

        // Notify user (founder)
        const userNotifBody = buildBookingEmailBody({
          userName: isMentorRescheduling ? mentorName : reschedulerName,
          ...rescheduleInAppParams,
          message: booking.message,
          recipientRole: 'user',
        });
        const userNotifData = {
          userId: bookingUserId,
          type: 'BOOKING_CONFIRMED' as const,
          notificationTitle: 'Call rescheduled & confirmed',
          notificationBody: userNotifBody,
          inAppBody: buildBookingInAppBody({ userName: isMentorRescheduling ? mentorName : reschedulerName, ...rescheduleInAppParams }),
          notificationLink: `${appConfig.frontendUrl}/my-bookings`,
          actorId: userId,
          subjectType: 'Booking' as const,
          subjectId: booking.id,
        };
        await dispatch(NotificationJob, userNotifData);
        await dispatch(NotificationEmailJob, userNotifData);

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

      // New booking (non-reschedule)
      const scheduledEnd = new Date(scheduledAt.getTime() + data.duration * 60 * 1000);
      const booking = await (prisma as any).booking.create({
        data: {
          mentor_id: mentor.id,
          user_id: userId,
          title: '1:1 Video Call',
          duration: data.duration,
          scheduled_at: scheduledAt,
          scheduled_end: scheduledEnd,
          message: data.message?.trim() || null,
          amount,
          currency_id: 1, // INR default
          wants_recording: wantsRecording,
          recording_amount: recordingAmount > 0 ? recordingAmount : null,
        },
      });

      // Activity log
      await (prisma as any).bookingActivity.create({
        data: {
          booking_id: booking.id,
          action: 'CREATED',
          acted_by: userId,
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
        include: { mentor: { select: { id: true, razorpay_account_id: true, razorpay_agency_account_id: true, show_as_agency: true } } },
      });
      if (!booking) return { success: false, message: 'Booking not found' };
      if (booking.status !== 'PENDING') return { success: false, message: 'Booking is not in pending state' };
      if (booking.payment_status !== 'UNPAID') return { success: false, message: 'Payment already initiated' };

      const baseAmount = Number(booking.amount);
      if (baseAmount <= 0) return { success: false, message: 'Invalid booking amount' };

      // Mentor must have Razorpay linked account for Route transfer (agency account if show_as_agency)
      const mentor = booking.mentor;
      const mentorAccountId = (mentor?.show_as_agency && mentor?.razorpay_agency_account_id)
        ? mentor.razorpay_agency_account_id as string
        : mentor?.razorpay_account_id as string | null;
      if (!mentorAccountId) {
        return { success: false, message: 'Mentor has not completed Razorpay account linking. Payment cannot proceed.' };
      }

      // Platform fee (configurable, currently 0%) + service fee deducted from mentor at release
      const founderCalc = calcBookingFounderTotal(baseAmount);
      const deductions = calcBookingMentorDeductions(baseAmount);
      const mentorPayout = calcBookingMentorPayout(baseAmount);

      // Razorpay rejects orders (and Route transfers) below ₹1. Guard here so
      // the user gets a clear message instead of the raw gateway error.
      const MIN_ORDER_INR = 1;
      if (founderCalc.totalBookerPays < MIN_ORDER_INR || mentorPayout < MIN_ORDER_INR) {
        return {
          success: false,
          message: `Booking total must be at least ₹${MIN_ORDER_INR}. Please pick a longer session duration.`,
        };
      }

      // Store platform fee and reset created_at to extend the 3-min slot hold
      // while the user completes payment (gives another 10 min from now)
      await (prisma as any).booking.update({
        where: { id: booking.id },
        data: {
          platform_fee: founderCalc.platformFee + founderCalc.platformFeeGst,
          created_at: new Date(Date.now() + 7 * 60 * 1000),
        },
      });

      const result = await BillingService.createVerificationOrder(String(userId), founderCalc.totalBookerPays, {
        receiptPrefix: 'booking',
        notes: { purpose: 'mentor_booking', booking_id: String(booking.id), user_id: String(userId) },
        freelancerTransfer: { accountId: mentorAccountId, amountInr: mentorPayout },
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
        data: {
          ...result.data,
          breakdown: {
            baseAmount,
            platformFee: founderCalc.platformFee,
            platformFeeGst: founderCalc.platformFeeGst,
            totalBookerPays: founderCalc.totalBookerPays,
            mentorPayout,
            serviceFee: deductions.serviceFee,
            serviceFeeGst: deductions.serviceFeeGst,
            processingFee: deductions.processingFee,
            processingFeeGst: deductions.processingFeeGst,
          },
        },
      };
    } catch (error: any) {
      Log.error('Create booking order error', { error });
      return { success: false, message: error.message || 'Failed to create order' };
    }
  }

  /**
   * Verify Razorpay payment and confirm booking.
   */
  /**
   * Auto-sync a confirmed booking to Google Calendar via the mentor's connected
   * calendar: creates (or, on reschedule, patches) an event with a Google Meet
   * link and the founder as an attendee, so it lands on both participants'
   * calendars. Best-effort — never throws, so it can't break the booking flow.
   */
  private static async syncBookingToCalendar(bookingId: number): Promise<void> {
    try {
      const booking = await (prisma as any).booking.findUnique({
        where: { id: bookingId },
        include: {
          mentor: {
            select: { id: true, first_name: true, last_name: true, email: true, google_calendar_refresh_token: true },
          },
          user: { select: { first_name: true, last_name: true, email: true } },
        },
      });
      if (!booking) return;

      // Sync happens through the mentor's calendar — it's the one that generates
      // the Meet link. If the mentor hasn't connected, leave it to the manual
      // "add meeting link" flow.
      if (!booking.mentor?.google_calendar_refresh_token) {
        Log.info(`Booking ${bookingId}: mentor has no Google Calendar connected — skipping auto-sync`);
        return;
      }

      const mentorName = `${booking.mentor.first_name ?? ''} ${booking.mentor.last_name ?? ''}`.trim();
      const founderName = `${booking.user.first_name ?? ''} ${booking.user.last_name ?? ''}`.trim();
      const summary = `${booking.title} — ${mentorName} & ${founderName}`.trim();
      const description = booking.message ? `Discussion points:\n${booking.message}` : undefined;
      const attendeeEmails = [booking.mentor.email, booking.user.email].filter(Boolean) as string[];
      const startTime = new Date(booking.scheduled_at);
      const existingEventId = (booking.meta as any)?.google_calendar_event_id as string | undefined;

      const result = existingEventId
        ? await GoogleMeetService.updateBookingEvent({
            hostUserId: booking.mentor.id,
            eventId: existingEventId,
            startTime,
            durationMinutes: booking.duration,
          })
        : await GoogleMeetService.createBookingEvent({
            hostUserId: booking.mentor.id,
            summary,
            description,
            startTime,
            durationMinutes: booking.duration,
            attendeeEmails,
          });

      await (prisma as any).booking.update({
        where: { id: bookingId },
        data: {
          meeting_link: result.meetLink ?? booking.meeting_link,
          meeting_provider: 'google_meet',
          meta: { ...((booking.meta as any) || {}), google_calendar_event_id: result.eventId },
        },
      });

      Log.info(`Booking ${bookingId}: synced to Google Calendar (event ${result.eventId})`);
    } catch (err: any) {
      Log.error('Failed to auto-sync booking to Google Calendar', {
        bookingId,
        message: err?.message,
        googleError: err?.response?.data,
      });
    }
  }

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

      const baseAmount = Number(booking.amount);
      const founderCalc = calcBookingFounderTotal(baseAmount);
      const deductions = calcBookingMentorDeductions(baseAmount);
      const mentorPayout = calcBookingMentorPayout(baseAmount);

      // Create BillingTransaction for billing history
      const billingTx = await (prisma as any).billingTransaction.create({
        data: {
          actor_type: 'User',
          actor_id: userId,
          from_type: 'User',
          from_id: userId,
          to_type: 'User',
          to_id: booking.mentor_id,
          subject_type: 'Booking',
          subject_id: booking.id,
          amount: baseAmount,
          payer_amount: founderCalc.totalBookerPays,
          receiver_amount: mentorPayout,
          currency_id: booking.currency_id ?? 1,
          type: BillingTransactionType.PAYMENT,
          status: BillingTransactionStatus.PENDING,
          sender_status: BillingTransactionSenderStatus.FUNDED,
          receiver_status: BillingTransactionReceiverStatus.PENDING,
          description: `1:1 Video Call booking — ${booking.duration} min session`,
          meta: {
            razorpay_order_id: data.razorpayOrderId,
            razorpay_payment_id: data.razorpayPaymentId,
          },
          platform_fee_amount: founderCalc.platformFee,
          platform_fee_gst: founderCalc.platformFeeGst,
          commission_amount: deductions.serviceFee,
          commission_gst: deductions.serviceFeeGst,
          processing_fee_amount: deductions.processingFee,
          processing_fee_gst: deductions.processingFeeGst,
          tcs_amount: 0,
          on_hold: true,
        },
      });

      // Fetch & store Razorpay Route transfer ID
      if (data.razorpayPaymentId && razorpay) {
        try {
          const transfers = await razorpay.payments.fetchTransfer(data.razorpayPaymentId);
          const transferId = transfers?.items?.[0]?.id ?? null;
          if (transferId) {
            await (prisma as any).billingTransaction.update({
              where: { id: billingTx.id },
              data: { razorpay_transfer_id: transferId },
            });
          }
        } catch (err) {
          Log.error('Failed to fetch Razorpay transfer ID for booking', { err, paymentId: data.razorpayPaymentId });
        }
      }

      // Update booking with payment info and link to billing transaction
      await (prisma as any).booking.update({
        where: { id: booking.id },
        data: {
          status: 'CONFIRMED',
          payment_status: 'PAID',
          billing_transaction_id: billingTx.id,
          meta: {
            razorpay_order_id: data.razorpayOrderId,
            razorpay_payment_id: data.razorpayPaymentId,
          },
        },
      });

      // Activity log
      await (prisma as any).bookingActivity.create({
        data: {
          booking_id: booking.id,
          action: 'CONFIRMED',
          acted_by: userId,
        },
      });

      // Auto-create the Google Calendar event + Meet link and invite the
      // founder (best-effort; won't block confirmation if it fails).
      await this.syncBookingToCalendar(booking.id);

      // Ensure mentor wallet exists & track pending amount
      await BillingService.ensureUserWallet(booking.mentor_id);
      await (prisma as any).userWallet.update({
        where: { user_id: booking.mentor_id },
        data: { pending_amount: { increment: baseAmount } },
      });

      // Generate Invoice C (ScaleDux → Founder, booking receipt)
      await BillingService.createInvoiceC(billingTx.id);

      // Notify both mentor and user after successful payment
      const userName = await getUserFullName(userId);
      const mentorName = `${booking.mentor.first_name} ${booking.mentor.last_name}`.trim();
      const isReschedule = booking.is_reschedule;

      // Notify mentor
      const mentorNotifTitle = isReschedule ? 'Call rescheduled & confirmed' : '1:1 Call booked';
      const confirmBaseParams = {
        duration: booking.duration,
        scheduledAt: new Date(booking.scheduled_at),
        isReschedule,
        type: 'confirmed' as const,
      };
      const mentorNotifBody = buildBookingEmailBody({
        userName,
        ...confirmBaseParams,
        message: booking.message,
      });
      const mentorNotifData = {
        userId: booking.mentor_id,
        type: 'BOOKING_CONFIRMED' as const,
        notificationTitle: mentorNotifTitle,
        notificationBody: mentorNotifBody,
        inAppBody: buildBookingInAppBody({ userName, ...confirmBaseParams }),
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
        ...confirmBaseParams,
        message: booking.message,
        recipientRole: 'user',
      });
      const userNotifData = {
        userId,
        type: 'BOOKING_CONFIRMED' as const,
        notificationTitle: userNotifTitle,
        notificationBody: userNotifBody,
        inAppBody: buildBookingInAppBody({ userName: mentorName, ...confirmBaseParams }),
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
        `${chatPrefix}`,
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

      const bookings = await Promise.all(slice.map(async (b: any) => ({
        uniqueId: b.unique_id,
        title: b.title,
        description: b.description,
        duration: b.duration,
        scheduledAt: b.scheduled_at,
        scheduledEnd: b.scheduled_end,
        message: b.message,
        status: b.status,
        paymentStatus: b.payment_status,
        amount: Number(b.amount),
        currency: b.currency?.code || 'INR',
        currencySymbol: b.currency?.symbol || '₹',
        isReschedule: b.is_reschedule,
        rescheduleCount: b.reschedule_count ?? 0,
        rescheduleRequestedAt: b.reschedule_requested_at ?? null,
        parentId: b.parent_id,
        meetingLink: b.meeting_link ?? null,
        meetingProvider: b.meeting_provider ?? null,
        meetingLinkRequested: !b.meeting_link && await (prisma as any).bookingActivity.count({ where: { booking_id: b.id, action: 'MEETING_LINK_REQUESTED' } }) > 0,
        completedAt: b.completed_at ?? null,
        rejectedAt: b.rejected_at ?? null,
        userApprovedAt: b.user_approved_at ?? null,
        wantsRecording: b.wants_recording ?? false,
        recordingAmount: b.recording_amount ? Number(b.recording_amount) : null,
        createdAt: b.created_at,
        mentor: {
          uniqueId: b.mentor.unique_id,
          firstName: b.mentor.first_name,
          lastName: b.mentor.last_name,
          profileImage: await resolveProfileImage(b.mentor.personalInfo?.profileImage),
        },
        user: {
          uniqueId: b.user.unique_id,
          firstName: b.user.first_name,
          lastName: b.user.last_name,
          profileImage: await resolveProfileImage(b.user.personalInfo?.profileImage),
        },
      })));

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
          billing_transaction: { select: { unique_id: true, payer_amount: true } },
          activities: {
            orderBy: { created_at: 'desc' },
            select: { action: true, reason: true, remark: true, acted_by: true, created_at: true },
          },
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
          scheduledEnd: booking.scheduled_end,
          message: booking.message,
          status: booking.status,
          paymentStatus: booking.payment_status,
          amount: Number(booking.amount),
          billingTransactionUniqueId: booking.billing_transaction?.unique_id ?? null,
          amountPaid: booking.billing_transaction?.payer_amount != null
            ? Number(booking.billing_transaction.payer_amount)
            : Number(booking.amount),
          currency: booking.currency?.code || 'INR',
          currencySymbol: booking.currency?.symbol || '₹',
          platformFee: booking.platform_fee ? Number(booking.platform_fee) : null,
          wantsRecording: booking.wants_recording ?? false,
          recordingAmount: booking.recording_amount ? Number(booking.recording_amount) : null,
          isReschedule: booking.is_reschedule,
          rescheduleCount: booking.reschedule_count ?? 0,
          rescheduleRequestedAt: booking.reschedule_requested_at ?? null,
          parentId: booking.parent_id,
          meetingLink: booking.meeting_link ?? null,
          meetingProvider: booking.meeting_provider ?? null,
          meetingLinkRequested: !booking.meeting_link && (booking.activities ?? []).some((a: any) => a.action === 'MEETING_LINK_REQUESTED'),
          completedAt: booking.completed_at ?? null,
          rejectedAt: booking.rejected_at ?? null,
          userApprovedAt: booking.user_approved_at ?? null,
          activities: booking.activities,
          createdAt: booking.created_at,
          mentor: {
            id: booking.mentor.id,
            uniqueId: booking.mentor.unique_id,
            firstName: booking.mentor.first_name,
            lastName: booking.mentor.last_name,
            profileImage: await resolveProfileImage(booking.mentor.personalInfo?.profileImage),
            tagline: booking.mentor.personalInfo?.title || null,
          },
          user: {
            id: booking.user.id,
            uniqueId: booking.user.unique_id,
            firstName: booking.user.first_name,
            lastName: booking.user.last_name,
            profileImage: await resolveProfileImage(booking.user.personalInfo?.profileImage),
          },
        },
      };
    } catch (error: any) {
      Log.error('Get booking error', { error });
      return { success: false, message: error.message || 'Failed to fetch booking' };
    }
  }

  /**
   * Toggle recording add-on on a PENDING (unpaid) booking.
   */
  static async updateRecording(userId: number, bookingUniqueId: string, wantsRecording: boolean): Promise<ServiceResponse> {
    try {
      const booking = await (prisma as any).booking.findFirst({
        where: { unique_id: bookingUniqueId, user_id: userId, status: 'PENDING', payment_status: 'UNPAID' },
        include: { mentor: { select: { id: true } } },
      });
      if (!booking) return { success: false, message: 'Booking not found or already paid' };

      const settings = await (prisma as any).mentorOnRequest.findUnique({ where: { user_id: booking.mentor.id } });
      if (!settings || !settings.recording_enabled) {
        return { success: false, message: 'Recording is not available for this booking' };
      }

      // Recompute call-only amount
      let hourlyRate = settings.price_amount != null ? Number(settings.price_amount) : 0;
      if (
        settings.discount_enabled &&
        settings.discount_percent > 0 &&
        (!settings.discount_available_till || new Date(settings.discount_available_till) > new Date())
      ) {
        hourlyRate = Math.round(hourlyRate * (1 - settings.discount_percent / 100) * 100) / 100;
      }
      const callAmount = Math.round((hourlyRate / 60) * booking.duration * 100) / 100;

      const recordingAmount =
        wantsRecording && settings.recording_type === 'paid' && settings.recording_amount != null
          ? Math.round(Number(settings.recording_amount) * 100) / 100
          : 0;
      const newAmount = callAmount + recordingAmount;

      await (prisma as any).booking.update({
        where: { id: booking.id },
        data: {
          wants_recording: wantsRecording,
          recording_amount: recordingAmount > 0 ? recordingAmount : null,
          amount: newAmount,
        },
      });

      return {
        success: true,
        message: 'Recording preference updated',
        data: { wantsRecording, recordingAmount: recordingAmount > 0 ? recordingAmount : null, amount: newAmount },
      };
    } catch (error: any) {
      Log.error('Update recording error', { error });
      return { success: false, message: error.message || 'Failed to update recording preference' };
    }
  }

  /**
   * Cancel a booking. Both mentor and user can cancel.
   */
  static async cancelBooking(
    userId: number,
    uniqueId: string,
    reason?: string,
    remark?: string
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

      // Reason may come from a normal cancellation (CANCEL) or from declining a reschedule request (DECLINE_RESCHEDULE).
      if (reason && !isValidMeetingReason('CANCEL', reason) && !isValidMeetingReason('DECLINE_RESCHEDULE', reason)) {
        return { success: false, message: 'Invalid cancel reason' };
      }

      await (prisma as any).booking.update({
        where: { id: booking.id },
        data: {
          status: 'CANCELLED',
          cancelled_by: userId,
          cancelled_at: new Date(),
          reschedule_requested_at: null,
        },
      });

      await (prisma as any).bookingActivity.create({
        data: {
          booking_id: booking.id,
          action: 'CANCELLED',
          reason: reason?.trim() || null,
          remark: remark?.trim() || null,
          acted_by: userId,
        },
      });

      // Notify both parties
      const cancellerName = await getUserFullName(userId);
      const cancelParams = {
        userName: cancellerName,
        duration: booking.duration,
        scheduledAt: new Date(booking.scheduled_at),
        cancelledBy: cancellerName,
        cancelReason: reason?.trim(),
        type: 'cancelled' as const,
      };
      const emailBody = buildBookingEmailBody(cancelParams);
      const inAppBody = buildBookingInAppBody(cancelParams);

      for (const recipientId of [booking.mentor_id, booking.user_id]) {
        const notifData = {
          userId: recipientId,
          type: 'BOOKING_CANCELLED' as const,
          notificationTitle: '1:1 Call cancelled',
          notificationBody: emailBody,
          inAppBody,
          notificationLink: `${appConfig.frontendUrl}/my-bookings`,
          actorId: userId,
          subjectType: 'Booking' as const,
          subjectId: booking.id,
        };
        await dispatch(NotificationJob, notifData);
        await dispatch(NotificationEmailJob, notifData);
      }

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
   * Get analytics/insights for a mentor's bookings.
   * Supports periods: this-month, quarterly, ytd.
   */
  static async getAnalytics(
    mentorId: number,
    period: string
  ): Promise<ServiceResponse> {
    try {
      const now = new Date();
      let currentStart: Date;
      let prevStart: Date;
      let prevEnd: Date;

      if (period === 'quarterly') {
        const quarter = Math.floor(now.getMonth() / 3);
        currentStart = new Date(now.getFullYear(), quarter * 3, 1);
        const prevQuarter = quarter === 0 ? 3 : quarter - 1;
        const prevYear = quarter === 0 ? now.getFullYear() - 1 : now.getFullYear();
        prevStart = new Date(prevYear, prevQuarter * 3, 1);
        prevEnd = new Date(currentStart);
      } else if (period === 'ytd') {
        currentStart = new Date(now.getFullYear(), 0, 1);
        prevStart = new Date(now.getFullYear() - 1, 0, 1);
        prevEnd = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      } else {
        // this-month
        currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const prevMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
        const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
        prevStart = new Date(prevYear, prevMonth, 1);
        prevEnd = new Date(currentStart);
      }

      // Current period bookings
      const currentBookings = await (prisma as any).booking.findMany({
        where: {
          mentor_id: mentorId,
          status: { in: ['CONFIRMED', 'COMPLETED'] },
          created_at: { gte: currentStart, lte: now },
        },
        select: { id: true, title: true, amount: true, created_at: true },
      });

      // Previous period bookings
      const prevBookings = await (prisma as any).booking.findMany({
        where: {
          mentor_id: mentorId,
          status: { in: ['CONFIRMED', 'COMPLETED'] },
          created_at: { gte: prevStart, lt: prevEnd },
        },
        select: { id: true, title: true, amount: true },
      });

      const callTitle = '1:1 Video Call';

      // Current counts & revenue
      const totalBookings = currentBookings.length;
      const callBookings = currentBookings.filter((b: any) => b.title === callTitle);
      const packageBookings = currentBookings.filter((b: any) => b.title !== callTitle);
      const callCount = callBookings.length;
      const packageCount = packageBookings.length;
      const callRevenue = callBookings.reduce((sum: number, b: any) => sum + Number(b.amount), 0);
      const packageRevenue = packageBookings.reduce((sum: number, b: any) => sum + Number(b.amount), 0);

      // Previous counts & revenue
      const prevTotal = prevBookings.length;
      const prevCallRevenue = prevBookings
        .filter((b: any) => b.title === callTitle)
        .reduce((sum: number, b: any) => sum + Number(b.amount), 0);
      const prevPackageRevenue = prevBookings
        .filter((b: any) => b.title !== callTitle)
        .reduce((sum: number, b: any) => sum + Number(b.amount), 0);

      // Trend calculation
      const calcTrend = (current: number, prev: number) => {
        if (prev === 0) return current > 0 ? 100 : 0;
        return Math.round(((current - prev) / prev) * 100);
      };

      const bookingsTrend = calcTrend(totalBookings, prevTotal);
      const callRevenueTrend = calcTrend(callRevenue, prevCallRevenue);
      const packageRevenueTrend = calcTrend(packageRevenue, prevPackageRevenue);

      // Chart data — group by day (this-month) or by week (quarterly/ytd)
      const chartPoints: Record<string, { bookings: number; callRevenue: number; packageRevenue: number }> = {};

      for (const b of currentBookings) {
        const d = new Date(b.created_at);
        let key: string;
        if (period === 'this-month') {
          key = `${d.getMonth() + 1}/${d.getDate()}`;
        } else {
          // Weekly grouping — use ISO week start (Monday)
          const day = d.getDay();
          const monday = new Date(d);
          monday.setDate(d.getDate() - ((day + 6) % 7));
          key = `${monday.getMonth() + 1}/${monday.getDate()}`;
        }
        if (!chartPoints[key]) chartPoints[key] = { bookings: 0, callRevenue: 0, packageRevenue: 0 };
        chartPoints[key].bookings += 1;
        const amt = Number(b.amount);
        if (b.title === callTitle) {
          chartPoints[key].callRevenue += amt;
        } else {
          chartPoints[key].packageRevenue += amt;
        }
      }

      const chartData = Object.entries(chartPoints)
        .map(([label, vals]) => ({ label, ...vals }));

      return {
        success: true,
        message: 'Analytics fetched',
        data: {
          totalBookings,
          callCount,
          packageCount,
          callRevenue: Math.round(callRevenue * 100) / 100,
          packageRevenue: Math.round(packageRevenue * 100) / 100,
          bookingsTrend,
          callRevenueTrend,
          packageRevenueTrend,
          chartData,
        },
      };
    } catch (error: any) {
      Log.error('Get booking analytics error', { error });
      return { success: false, message: error.message || 'Failed to fetch analytics' };
    }
  }

  /**
   * Get occupied time ranges for a mentor on a given date.
   * Returns array of { start (minutes since midnight), end (minutes since midnight) }.
   * Used by frontend to disable booked slots.
   */
  static async getOccupiedSlots(
    mentorUniqueId: string,
    date: string, // YYYY-MM-DD
    viewerId?: number
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
          // Exclude the viewer's own PENDING bookings so they can re-select their slot
          ...(viewerId ? { NOT: { user_id: viewerId, status: 'PENDING' } } : {}),
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

      // Activity log
      await (prisma as any).bookingActivity.create({
        data: {
          booking_id: booking.id,
          action: isUpdate ? 'MEETING_LINK_UPDATED' : 'MEETING_LINK_ADDED',
          acted_by: mentorId,
        },
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

  /**
   * Mark a confirmed booking as completed. Mentor-only action.
   * On success=true: both parties get a rating prompt linking to /my-bookings/[id]/submit-review.
   * On success=false: only the founder gets a BOOKING_COMPLETED confirmation with the reason/remark.
   */
  static async completeBooking(
    mentorId: number,
    bookingUniqueId: string,
    data: { success: boolean; reason?: string | null; remark?: string | null }
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
      if (booking.status !== 'CONFIRMED') {
        return { success: false, message: 'Only confirmed bookings can be marked complete' };
      }
      if (new Date(booking.scheduled_end).getTime() > Date.now()) {
        return { success: false, message: 'Call has not ended yet' };
      }

      const reason = data.success ? null : (data.reason?.trim() || null);
      const remark = data.success ? null : (data.remark?.trim() || null);

      if (!data.success) {
        if (!reason) return { success: false, message: 'Reason is required when call did not complete successfully' };
        if (!isValidMeetingReason('REJECT', reason)) {
          return { success: false, message: 'Invalid reason' };
        }
      }

      const newStatus = data.success ? 'COMPLETED' : 'REJECTED';
      const now = new Date();

      await (prisma as any).booking.update({
        where: { id: booking.id },
        data: {
          status: newStatus,
          ...(data.success ? { completed_at: now } : { rejected_at: now }),
          // Stamp the reminder flag so cron never tries to email again, regardless of which path finished first.
          ...(booking.completion_reminder_sent_at ? {} : { completion_reminder_sent_at: now }),
        },
      });

      await (prisma as any).bookingActivity.create({
        data: {
          booking_id: booking.id,
          action: data.success ? 'COMPLETED' : 'REJECTED',
          reason,
          remark,
          acted_by: mentorId,
        },
      });

      const mentorName = `${booking.mentor.first_name} ${booking.mentor.last_name}`.trim();
      const scheduledAt = new Date(booking.scheduled_at);
      const dateStr = formatNotifDate(scheduledAt);

      const acceptLink = `${appConfig.frontendUrl}/my-bookings/${booking.unique_id}/accept-confirmation`;
      const bookingsLink = `${appConfig.frontendUrl}/my-bookings`;

      if (data.success) {
        // Notify founder to accept the meeting confirmation
        const founderBody = `<p><strong>${escapeHtml(mentorName)}</strong> has confirmed your 1:1 video call on <strong>${escapeHtml(dateStr)}</strong> as completed.</p>
           <p style="margin-top:12px;">Please accept the confirmation to proceed with reviews.</p>`;

        const founderCompletedData = {
          userId: booking.user_id,
          type: 'BOOKING_COMPLETED' as const,
          notificationTitle: 'Meeting confirmation received',
          notificationBody: founderBody,
          notificationLink: acceptLink,
          actorId: mentorId,
          subjectType: 'Booking' as const,
          subjectId: booking.id,
        };
        await dispatch(NotificationJob, founderCompletedData);
        await dispatch(NotificationEmailJob, founderCompletedData);

        // Chat with accept link
        await ConversationService.syncSystemMessage(
          booking.user_id, booking.mentor_id,
          `✅ ${mentorName} has confirmed the meeting as completed. Accept confirmation to proceed.`,
          {
            activityType: 'BOOKING_ACCEPT_PROMPT',
            bookingTitle: '1:1 Video Call',
            bookingDuration: booking.duration,
            bookingScheduledAt: booking.scheduled_at,
            bookingUniqueId: booking.unique_id,
            acceptLink,
          },
          undefined, mentorId
        );

        // Auto-generate Invoice A (Mentor → Booker, service invoice)
        if (booking.billing_transaction_id) {
          await BillingService.createInvoiceA(booking.billing_transaction_id);
        }
      } else {
        // Notify founder that call didn't happen
        const founderBody = `<p><strong>${escapeHtml(mentorName)}</strong> has reported that the 1:1 video call on <strong>${escapeHtml(dateStr)}</strong> did not take place.</p>
           <table style="border-collapse:collapse;margin:16px 0;width:100%;max-width:480px;">
             <tr><td style="padding:8px 0;color:#667085;font-size:14px;">Reason</td><td style="padding:8px 0;font-weight:600;font-size:14px;">${escapeHtml(reason!)}</td></tr>
             ${remark ? `<tr><td style="padding:8px 0;color:#667085;font-size:14px;vertical-align:top;">Remark</td><td style="padding:8px 0;font-size:14px;">${escapeHtml(remark)}</td></tr>` : ''}
           </table>`;

        const founderCompletedData = {
          userId: booking.user_id,
          type: 'BOOKING_COMPLETED' as const,
          notificationTitle: 'Call did not take place',
          notificationBody: founderBody,
          notificationLink: bookingsLink,
          actorId: mentorId,
          subjectType: 'Booking' as const,
          subjectId: booking.id,
        };
        await dispatch(NotificationJob, founderCompletedData);
        await dispatch(NotificationEmailJob, founderCompletedData);

        await ConversationService.syncSystemMessage(
          booking.user_id, booking.mentor_id,
          `⚠️ Call did not take place: ${reason}`,
          {
            activityType: 'BOOKING_COMPLETED',
            bookingTitle: '1:1 Video Call',
            bookingDuration: booking.duration,
            bookingScheduledAt: booking.scheduled_at,
            completionReason: reason,
            completionRemark: remark,
          },
          undefined, mentorId
        );
      }

      return {
        success: true,
        message: data.success ? 'Meeting confirmation sent' : 'Call reported as not completed',
        data: {
          booking: {
            unique_id: booking.unique_id,
            status: newStatus,
            reason,
            remark,
          },
        },
      };
    } catch (error: any) {
      Log.error('Complete booking error', { error });
      return { success: false, message: error.message || 'Failed to mark booking complete' };
    }
  }

  /**
   * User (founder) accepts the mentor's meeting completion confirmation.
   * Triggers rate prompts for both parties with review links.
   */
  static async acceptCompletion(
    userId: number,
    bookingUniqueId: string,
    opts: { accepted: boolean; reason?: string; remark?: string } = { accepted: true }
  ): Promise<ServiceResponse> {
    try {
      const booking = await (prisma as any).booking.findFirst({
        where: { unique_id: bookingUniqueId, user_id: userId },
        include: {
          mentor: { select: { id: true, first_name: true, last_name: true } },
          user: { select: { id: true, first_name: true, last_name: true } },
        },
      });
      if (!booking) return { success: false, message: 'Booking not found' };
      if (booking.status !== 'COMPLETED') {
        return { success: false, message: 'Booking is not in completed state' };
      }
      if (booking.user_approved_at) {
        return { success: false, message: 'You have already accepted this confirmation' };
      }

      // ── Rejection path ──────────────────────────────────────────────────────
      if (!opts.accepted) {
        await (prisma as any).bookingActivity.create({
          data: {
            booking_id: booking.id,
            action: 'USER_REJECTED',
            reason: opts.reason ?? null,
            remark: opts.remark ?? null,
            acted_by: userId,
          },
        });

        // Notify mentor of the dispute
        const founderName = `${booking.user.first_name} ${booking.user.last_name}`.trim();
        const disputeBody = `<p><strong>${escapeHtml(founderName)}</strong> has indicated that the call did not happen as expected.</p>
          ${opts.reason ? `<p><strong>Reason:</strong> ${escapeHtml(opts.reason)}</p>` : ''}
          ${opts.remark ? `<p><strong>Details:</strong> ${escapeHtml(opts.remark)}</p>` : ''}
          <p>Please contact ScaleDux support if you believe this is incorrect.</p>`;

        await dispatch(NotificationJob, {
          userId: booking.mentor_id,
          type: 'BOOKING_RATE_PROMPT' as const,
          notificationTitle: `${founderName} disputed the meeting confirmation`,
          notificationBody: disputeBody,
          notificationLink: `${appConfig.frontendUrl}/my-bookings`,
          actorId: userId,
          subjectType: 'Booking' as const,
          subjectId: booking.id,
        });

        return {
          success: true,
          message: 'Dispute recorded',
          data: { booking: { unique_id: booking.unique_id, status: booking.status } },
        };
      }

      // ── Acceptance path ─────────────────────────────────────────────────────
      await (prisma as any).booking.update({
        where: { id: booking.id },
        data: { user_approved_at: new Date(), payment_status: 'RELEASED' },
      });

      await (prisma as any).bookingActivity.create({
        data: {
          booking_id: booking.id,
          action: 'USER_ACCEPTED',
          acted_by: userId,
        },
      });

      // Generate Invoice B + payout mentor via Razorpay X
      if (booking.billing_transaction_id) {
        const tx = await (prisma as any).billingTransaction.findUnique({
          where: { id: booking.billing_transaction_id },
        });

        if (tx) {
          // Generate Invoice B (ScaleDux → Mentor, service fee + processing fee deduction)
          await BillingService.createInvoiceB(tx.id);

          // Release Razorpay Route transfer hold → mentor gets paid (T+2)
          let transferId = tx.razorpay_transfer_id;

          // If transfer ID wasn't stored earlier, try fetching it now from the payment
          if (!transferId && razorpay && tx.meta?.razorpay_payment_id) {
            try {
              const transfers = await razorpay.payments.fetchTransfer(tx.meta.razorpay_payment_id);
              transferId = transfers?.items?.[0]?.id ?? null;
              if (transferId) {
                await (prisma as any).billingTransaction.update({
                  where: { id: tx.id },
                  data: { razorpay_transfer_id: transferId },
                });
                Log.info('Recovered missing transfer ID from payment', { transferId, paymentId: tx.meta.razorpay_payment_id });
              }
            } catch (err: any) {
              Log.error('Failed to recover transfer ID from payment', { err: err?.message, paymentId: tx.meta.razorpay_payment_id });
            }
          }

          if (transferId && razorpay) {
            try {
              const editRes = await razorpay.transfers.edit(transferId, { on_hold: 0 });
              Log.info('Razorpay transfer hold released', { transferId, settlement_status: editRes?.settlement_status });
            } catch (err: any) {
              Log.error('Failed to release Razorpay transfer hold for booking', {
                transferId,
                message: err?.message,
                statusCode: err?.statusCode,
                error: err?.error,
              });
            }
          } else {
            Log.warn('Cannot release transfer hold — missing transfer ID or Razorpay client', {
              transferId, hasRazorpay: !!razorpay,
            });
          }

          // Update BillingTransaction status — mark as payment_processed; COMPLETED/RELEASED set via webhook
          await (prisma as any).billingTransaction.update({
            where: { id: tx.id },
            data: {
              status: BillingTransactionStatus.PAYMENT_PROCESSED,
              sender_status: BillingTransactionSenderStatus.FUNDED,
              receiver_status: BillingTransactionReceiverStatus.PAYMENT_PROCESSED,
              on_hold: false,
            },
          });

          // Move funds from pending → available in mentor's wallet
          const txAmount = Number(tx.amount) || 0;
          const txCommission = Number(tx.commission_amount) || 0;
          const txCommissionGst = Number(tx.commission_gst) || 0;
          const txProcessingFee = Number(tx.processing_fee_amount) || 0;
          const txProcessingFeeGst = Number(tx.processing_fee_gst) || 0;
          const txTcs = Number(tx.tcs_amount) || 0;
          const netPayout = txAmount - txCommission - txCommissionGst - txProcessingFee - txProcessingFeeGst - txTcs;
          await (prisma as any).userWallet.update({
            where: { user_id: booking.mentor_id },
            data: {
              pending_amount: { decrement: txAmount },
              wallet_amount: { increment: netPayout },
              total_earning: { increment: netPayout },
            },
          });
        }
      }

      // Now send rate prompts to both parties
      const mentorName = `${booking.mentor.first_name} ${booking.mentor.last_name}`.trim();
      const founderName = `${booking.user.first_name} ${booking.user.last_name}`.trim();
      const scheduledAt = new Date(booking.scheduled_at);
      const dateStr = formatNotifDate(scheduledAt);
      const reviewLink = `${appConfig.frontendUrl}/my-bookings/${booking.unique_id}/submit-review`;

      const rateBody = (otherName: string) => `<p>Your 1:1 video call with <strong>${escapeHtml(otherName)}</strong> on <strong>${escapeHtml(dateStr)}</strong> has been completed.</p>
        <p>Please take a moment to leave a review — your public rating helps other founders and mentors on ScaleDux, and private feedback is shared only with ${escapeHtml(otherName)}.</p>`;

      // Founder rates mentor
      const founderRateData = {
        userId: booking.user_id,
        type: 'BOOKING_RATE_PROMPT' as const,
        notificationTitle: `Rate your call with ${mentorName}`,
        notificationBody: rateBody(mentorName),
        notificationLink: reviewLink,
        actorId: booking.mentor_id,
        subjectType: 'Booking' as const,
        subjectId: booking.id,
      };
      await dispatch(NotificationJob, founderRateData);
      await dispatch(NotificationEmailJob, founderRateData);

      // Mentor rates founder
      const mentorRateData = {
        userId: booking.mentor_id,
        type: 'BOOKING_RATE_PROMPT' as const,
        notificationTitle: `Rate your call with ${founderName}`,
        notificationBody: rateBody(founderName),
        notificationLink: reviewLink,
        actorId: booking.user_id,
        subjectType: 'Booking' as const,
        subjectId: booking.id,
      };
      await dispatch(NotificationJob, mentorRateData);
      await dispatch(NotificationEmailJob, mentorRateData);

      // Chat with review link
      await ConversationService.syncSystemMessage(
        booking.user_id, booking.mentor_id,
        `⭐ ${founderName} accepted the meeting confirmation. Time to rate your call!`,
        {
          activityType: 'BOOKING_RATE_PROMPT',
          bookingTitle: '1:1 Video Call',
          bookingScheduledAt: booking.scheduled_at,
          bookingUniqueId: booking.unique_id,
          reviewLink,
        },
        undefined, userId
      );

      return {
        success: true,
        message: 'Confirmation accepted',
        data: { booking: { unique_id: booking.unique_id, status: 'COMPLETED' } },
      };
    } catch (error: any) {
      Log.error('Accept completion error', { error });
      return { success: false, message: error.message || 'Failed to accept confirmation' };
    }
  }

  /**
   * Mentor requests a reschedule — does NOT reschedule directly.
   * Sends notification, email, and chat message to the founder.
   */
  static async requestReschedule(
    userId: number,
    bookingUniqueId: string,
    reason?: string,
    remark?: string,
  ): Promise<ServiceResponse> {
    try {
      const booking = await (prisma as any).booking.findFirst({
        where: { unique_id: bookingUniqueId, mentor_id: userId, status: 'CONFIRMED' },
        include: {
          user: { select: { id: true, first_name: true, last_name: true, email: true } },
          mentor: { select: { id: true, unique_id: true, first_name: true, last_name: true } },
        },
      });
      if (!booking) return { success: false, message: 'Booking not found or you are not the mentor' };

      // Block if a reschedule request is already pending
      if (booking.reschedule_requested_at) {
        return { success: false, message: 'A reschedule request is already pending' };
      }

      // Max 2 reschedule requests per booking
      const rescheduleRequestCount = await (prisma as any).bookingActivity.count({
        where: { booking_id: booking.id, action: 'RESCHEDULE_REQUESTED' },
      });
      if (rescheduleRequestCount >= 2) {
        return { success: false, message: 'Maximum 2 reschedule requests allowed per booking' };
      }

      const minsUntil = (new Date(booking.scheduled_at).getTime() - Date.now()) / 60000;
      if (minsUntil < 60) {
        return { success: false, message: 'Cannot request reschedule less than 1 hour before the call' };
      }

      if (reason && !isValidMeetingReason('RESCHEDULE', reason)) {
        return { success: false, message: 'Invalid reschedule reason' };
      }

      const mentorName = `${booking.mentor.first_name} ${booking.mentor.last_name}`.trim();
      const dateStr = formatNotifDate(new Date(booking.scheduled_at));
      const reasonText = reason ? ` Reason: ${reason}.` : '';
      const remarkText = remark?.trim() ? ` Note: "${remark.trim()}"` : '';
      // Deep link that takes the founder straight into picking a new time for this call.
      const rescheduleLink = `${appConfig.frontendUrl}/book-a-call/${booking.mentor.unique_id}?reschedule=${booking.unique_id}`;

      // Mark the booking as having a pending reschedule request (drives the founder's "Reschedule meeting" button).
      await (prisma as any).booking.update({
        where: { id: booking.id },
        data: { reschedule_requested_at: new Date() },
      });

      // Activity log
      await (prisma as any).bookingActivity.create({
        data: {
          booking_id: booking.id,
          action: 'RESCHEDULE_REQUESTED',
          reason: reason?.trim() || null,
          remark: remark?.trim() || null,
          acted_by: userId,
        },
      });

      // Email body
      const emailBody = `<p><strong>${escapeHtml(mentorName)}</strong> has requested to reschedule the 1:1 video call scheduled for <strong>${escapeHtml(dateStr)}</strong>.</p>` +
        (reason ? `<p style="font-size:13px;color:#667085;"><strong>Reason:</strong> ${escapeHtml(reason)}</p>` : '') +
        (remark?.trim() ? `<p style="font-size:13px;color:#667085;"><strong>Note:</strong> ${escapeHtml(remark.trim())}</p>` : '') +
        `<p>You can <a href="${rescheduleLink}">pick a new time</a> for the call, or manage it from your <a href="${appConfig.frontendUrl}/my-bookings">bookings page</a>.</p>`;

      const inAppBody = `${mentorName} requested to reschedule the call on ${dateStr}.${reasonText}${remarkText}`;

      // Notify founder
      const notifData = {
        userId: booking.user_id,
        type: 'BOOKING_RESCHEDULE_REQUESTED' as const,
        notificationTitle: 'Reschedule requested',
        notificationBody: emailBody,
        inAppBody,
        notificationLink: rescheduleLink,
        actorId: userId,
        subjectType: 'Booking' as const,
        subjectId: booking.id,
      };
      await dispatch(NotificationJob, notifData);
      await dispatch(NotificationEmailJob, notifData);

      // Chat message — rescheduleLink + rescheduleUserId let the UI show a
      // "Reschedule call" button to the founder only (mentor can only request).
      const chatMsg = `📅 ${mentorName} has requested to reschedule the call.${reasonText}${remarkText}`;
      await ConversationService.syncSystemMessage(
        booking.user_id, booking.mentor_id,
        chatMsg,
        { activityType: 'BOOKING_RESCHEDULE_REQUESTED', bookingTitle: '1:1 Video Call', bookingDuration: booking.duration, bookingScheduledAt: booking.scheduled_at, rescheduleLink, rescheduleUserId: booking.user_id },
        undefined, userId
      );

      return { success: true, message: 'Reschedule request sent' };
    } catch (error: any) {
      Log.error('Request reschedule error', { error });
      return { success: false, message: error.message || 'Failed to send reschedule request' };
    }
  }

  /**
   * Founder requests the mentor to add a meeting link.
   * Rate-limited to one request per booking via BookingActivity.
   */
  static async requestMeetingLink(
    userId: number,
    bookingUniqueId: string,
  ): Promise<ServiceResponse> {
    try {
      const booking = await (prisma as any).booking.findFirst({
        where: { unique_id: bookingUniqueId, user_id: userId, status: 'CONFIRMED' },
        include: {
          user: { select: { id: true, first_name: true, last_name: true } },
          mentor: { select: { id: true, first_name: true, last_name: true } },
        },
      });
      if (!booking) return { success: false, message: 'Booking not found or you are not the attendee' };
      if (booking.meeting_link) return { success: false, message: 'Meeting link has already been added' };

      // Rate-limit: allow only one request per booking
      const existing = await (prisma as any).bookingActivity.findFirst({
        where: { booking_id: booking.id, action: 'MEETING_LINK_REQUESTED' },
      });
      if (existing) return { success: false, message: 'Meeting link request already sent' };

      // Activity log
      await (prisma as any).bookingActivity.create({
        data: {
          booking_id: booking.id,
          action: 'MEETING_LINK_REQUESTED',
          acted_by: userId,
        },
      });

      const founderName = `${booking.user.first_name} ${booking.user.last_name}`.trim();
      const dateStr = formatNotifDate(new Date(booking.scheduled_at));
      const bookingLink = `${appConfig.frontendUrl}/my-bookings/${booking.unique_id}`;

      const emailBody = `<p><strong>${escapeHtml(founderName)}</strong> is requesting you to add a meeting link for the upcoming 1:1 video call on <strong>${escapeHtml(dateStr)}</strong>.</p>
        <table style="border-collapse:collapse;margin:16px 0;width:100%;max-width:480px;">
          <tr><td style="padding:8px 0;color:#667085;font-size:14px;">Duration</td><td style="padding:8px 0;font-weight:600;font-size:14px;">${booking.duration} minutes</td></tr>
        </table>
        <p>Please add a meeting link from your <a href="${bookingLink}" style="color:#7C3AED;">booking page</a>.</p>`;

      const notifData = {
        userId: booking.mentor_id,
        type: 'MEETING_LINK_REQUESTED' as const,
        notificationTitle: 'Meeting link requested',
        notificationBody: emailBody,
        notificationLink: bookingLink,
        actorId: userId,
        subjectType: 'Booking' as const,
        subjectId: booking.id,
      };
      await dispatch(NotificationJob, notifData);
      await dispatch(NotificationEmailJob, notifData);

      // Sync to chat
      await ConversationService.syncSystemMessage(
        booking.user_id, booking.mentor_id,
        `🔗 ${founderName} requested a meeting link for the upcoming call.\n📅 ${dateStr} · ${booking.duration} min\n👉 ${bookingLink}`,
        {
          activityType: 'MEETING_LINK_REQUESTED',
          bookingTitle: '1:1 Video Call',
          bookingDuration: booking.duration,
          bookingScheduledAt: booking.scheduled_at,
          bookingLink,
        },
        undefined, userId
      );

      return { success: true, message: 'Meeting link request sent' };
    } catch (error: any) {
      Log.error('Request meeting link error', { error });
      return { success: false, message: error.message || 'Failed to request meeting link' };
    }
  }

}
