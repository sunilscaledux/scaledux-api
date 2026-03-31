import { TaxInformationService } from "@module/tax-information/TaxInformationService";
import { Log } from "@services/loggerService";

export const name = "verify-gstin";
export const schedule = "*/1 * * * *"; // Every 1 minutes

export async function handle(): Promise<void> {
  const result = await TaxInformationService.verifyPendingGSTINs();
  Log.info(`[verify-gstin] Verified ${result.verified}, failed ${result.failed}`);
  if (result.errors.length > 0) {
    Log.error("[verify-gstin] Errors", { errors: result.errors });
  }
}
