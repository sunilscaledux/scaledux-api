import { prisma } from "@services/prismaService";
import { Log } from "@services/loggerService";
import { BillingService } from "../../module/billing/BillingService";
import { BookingService } from "../../module/booking/BookingService";
import { ProposalService } from "../../module/proposal/ProposalService";

/**
 * Auto-approve milestone invoices AND booking confirmations not acknowledged
 * by the founder within 48 hours. Triggers Razorpay transfer for milestones,
 * auto-accepts booking confirmation for bookings.
 *
 * Runs every 15 minutes.
 */
export const name = "invoice-auto-approve";
export const schedule = "*/15 * * * *";

const AUTO_APPROVE_HOURS = 48;

export async function handle(): Promise<void> {
  const cutoff = new Date();
  cutoff.setHours(cutoff.getHours() - AUTO_APPROVE_HOURS);

  // ── 1. Auto-approve milestone invoices ──
  const expiredInvoices = await (prisma as any).billingTransaction.findMany({
    where: {
      type: "payment",
      status: "pending",
      invoice_a_id: { not: null },
      invoice_sent_at: { not: null, lte: cutoff },
    },
    select: { id: true, unique_id: true, from_id: true },
    take: 50,
  });

  let invoiceCount = 0;
  for (const tx of expiredInvoices) {
    try {
      const result = await BillingService.acknowledgeMilestonePayment(
        tx.unique_id,
        tx.from_id
      );
      if (result.success) {
        invoiceCount += 1;
      } else {
        Log.error(`[invoice-auto-approve] Failed for tx ${tx.unique_id}: ${result.message}`);
      }
    } catch (err) {
      Log.error(`[invoice-auto-approve] Error for tx ${tx.unique_id}`, { err });
    }
  }

  // ── 2. Auto-accept booking confirmations ──
  const expiredBookings = await (prisma as any).booking.findMany({
    where: {
      status: "COMPLETED",
      completed_at: { not: null, lte: cutoff },
      user_approved_at: null,
    },
    select: { id: true, unique_id: true, user_id: true },
    take: 50,
  });

  let bookingCount = 0;
  for (const booking of expiredBookings) {
    try {
      const result = await BookingService.acceptCompletion(
        booking.user_id,
        booking.unique_id,
        { accepted: true }
      );
      if (result.success) {
        bookingCount += 1;
      } else {
        Log.error(`[invoice-auto-approve] Booking ${booking.unique_id}: ${result.message}`);
      }
    } catch (err) {
      Log.error(`[invoice-auto-approve] Booking error ${booking.unique_id}`, { err });
    }
  }

  // ── 3. Auto-complete projects 48h after all milestones finished ──
  const dueProjects = await (prisma as any).proposal.findMany({
    where: {
      status: "HIRED",
      milestones_completed_at: { not: null, lte: cutoff },
    },
    select: { unique_id: true },
    take: 50,
  });

  let projectCount = 0;
  for (const p of dueProjects) {
    try {
      const done = await ProposalService.autoCompleteProjectIfDue(p.unique_id);
      if (done) projectCount += 1;
    } catch (err) {
      Log.error(`[invoice-auto-approve] Project auto-complete error ${p.unique_id}`, { err });
    }
  }

  if (invoiceCount > 0 || bookingCount > 0 || projectCount > 0) {
    Log.info(`[invoice-auto-approve] Auto-approved ${invoiceCount} invoice(s), ${bookingCount} booking(s), completed ${projectCount} project(s)`);
  }
}
