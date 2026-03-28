import { BillingService } from "@module/billing/BillingService";
import { Log } from "@services/loggerService";

/** Verify pending GSTIN numbers via IDtoAI API; check registration status and address match. */
export const name = "verify-gstin";
export const schedule = "*/15 * * * *"; // Every 15 minutes

export async function handle(): Promise<void> {
  const result = await BillingService.verifyPendingGSTINs();
  if (result.verified > 0 || result.failed > 0) {
    Log.info(`[verify-gstin] Verified ${result.verified}, failed ${result.failed}`);
  }
  if (result.errors.length > 0) {
    Log.error("[verify-gstin] Errors", { errors: result.errors });
  }
}
