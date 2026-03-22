/**
 * App / billing config from env.
 * PLATFORM_GST_NUMBER, SERVICE_FEE_PERCENT, APP_FEE_FOUNDER, GST_PERCENT, RAZORPAY_PLATFORM_ACCOUNT_ID.
 */
const platformGstRaw = (process.env.PLATFORM_GST_NUMBER ?? process.env.GST_NUMBER ?? '').trim();
const serviceFeePercentRaw = process.env.SERVICE_FEE_PERCENT;
const appFeeFounderRaw = process.env.APP_FEE_FOUNDER;
const gstPercentRaw = process.env.GST_PERCENT;
const razorpayPlatformAccountRaw = (process.env.RAZORPAY_PLATFORM_ACCOUNT_ID ?? '').trim();

const identityCooldownDays = Math.max(
  1,
  parseInt(process.env.IDENTITY_VERIFICATION_COOLDOWN_DAYS || '15', 10)
);
const agencyCooldownDays = Math.max(
  1,
  parseInt(process.env.AGENCY_VERIFICATION_COOLDOWN_DAYS || '15', 10)
);

export const appConfig = {
  /** Platform GSTIN (for invoices). */
  platformGstNumber: platformGstRaw || null as string | null,

  /** Service fee percent (0–100) deducted from freelancer at release. Default 10. */
  serviceFeePercent: Math.min(100, Math.max(0, Number(serviceFeePercentRaw) || 10)),

  /** App fee (flat) charged to founder per payment. Default 100. */
  appFeeFounder: Math.max(0, Number(appFeeFounderRaw) || 100),

  /** GST percent (0–100) applied on app fee (founder) and on service charge (freelancer). Default 0. */
  gstPercent: Math.min(100, Math.max(0, Number(gstPercentRaw) || 18)),

  /** Razorpay platform linked account id (e.g. acc_scaledux123). When set, payment orders include a transfer to this account. */
  razorpayPlatformAccountId: razorpayPlatformAccountRaw || null as string | null,

  /**
   * Legal name (identity) and agency verifications: minimum days between approved submissions before resubmitting.
   * Email and phone can be updated anytime (separate flows).
   */
  verification: {
    identityCooldownDays,
    agencyCooldownDays,
  },
};
