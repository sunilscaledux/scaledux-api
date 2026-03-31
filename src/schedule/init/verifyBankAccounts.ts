import { BankInformationService } from "@module/bank-information/BankInformationService";
import { Log } from "@services/loggerService";

/** Verify pending bank accounts with Razorpay X (contact + fund account). */
export const name = "verify-bank-accounts";
export const schedule = "*/15 * * * *"; // Every 15 minutes

export async function handle(): Promise<void> {
  const result = await BankInformationService.verifyPendingBankAccounts();
  Log.info(`[verify-bank-accounts] Verified ${result.verified}, failed ${result.failed}`);
  if (result.errors.length > 0) {
    Log.error("[verify-bank-accounts] Errors", { errors: result.errors });
  }
}
