import { BillingService } from "@module/billing/BillingService";

/** Verify pending bank accounts with Razorpay X (contact + fund account); set razorpay_fund_account_id and verification_status. */
export const name = "verify-bank-accounts";
export const schedule = "*/15 * * * *"; // Every 15 minutes

export async function handle(): Promise<void> {
  const result = await BillingService.verifyPendingBankAccounts();
  if (result.verified > 0 || result.failed > 0) {
    console.log(`[verify-bank-accounts] Verified ${result.verified}, failed ${result.failed}`);
  }
  if (result.errors.length > 0) {
    console.error("[verify-bank-accounts] Errors:", result.errors);
  }
}
