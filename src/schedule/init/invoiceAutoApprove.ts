import { prisma } from "@services/prismaService";
import { Log } from "@services/loggerService";
import { BillingService } from "../../module/billing/BillingService";

/**
 * Auto-approve milestone invoices not acknowledged by the founder within 48 hours.
 * Triggers Razorpay transfer (same as manual acknowledge).
 *
 * Runs every 15 minutes.
 */
export const name = "invoice-auto-approve";
export const schedule = "*/15 * * * *";

const AUTO_APPROVE_HOURS = 48;

export async function handle(): Promise<void> {
  const cutoff = new Date();
  cutoff.setHours(cutoff.getHours() - AUTO_APPROVE_HOURS);

  // Find funded transactions where invoice was sent but not acknowledged within 24h
  const expired = await (prisma as any).billingTransaction.findMany({
    where: {
      type: "payment",
      status: "pending",
      invoice_a_id: { not: null },
      invoice_sent_at: { not: null, lte: cutoff },
    },
    select: { id: true, unique_id: true, from_id: true },
    take: 50,
  });

  if (expired.length === 0) return;

  let count = 0;

  for (const tx of expired) {
    try {
      const result = await BillingService.acknowledgeMilestonePayment(
        tx.unique_id,
        tx.from_id // founder (payer) id — same as manual acknowledge
      );

      if (result.success) {
        count += 1;
      } else {
        Log.error(`[invoice-auto-approve] Failed for tx ${tx.unique_id}: ${result.message}`);
      }
    } catch (err) {
      Log.error(`[invoice-auto-approve] Error for tx ${tx.unique_id}`, { err });
    }
  }

  if (count > 0) {
    Log.info(`[invoice-auto-approve] Auto-approved ${count} invoice(s)`);
  }
}
