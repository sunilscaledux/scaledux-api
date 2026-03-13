import { BillingService } from "@module/billing/BillingService";
import { Log } from "@services/loggerService";

/** Process pending withdrawal requests (Razorpay payout, then mark completed/failed). */
export const name = "process-withdrawals";
export const schedule = "0 * * * *"; // Every hour

export async function handle(): Promise<void> {
  const result = await BillingService.processWithdrawalRequests();
  if (result.processed > 0 || result.failed > 0) {
    Log.info(`[process-withdrawals] Processed ${result.processed}, failed ${result.failed}`);
  }
  if (result.errors.length > 0) {
    Log.error("[process-withdrawals] Errors", { errors: result.errors });
  }
}
