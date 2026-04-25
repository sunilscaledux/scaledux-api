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
const taxCooldownDays = Math.max(
  1,
  parseInt(process.env.TAX_VERIFICATION_COOLDOWN_DAYS || '15', 10)
);
const bankCooldownDays = Math.max(
  1,
  parseInt(process.env.BANK_VERIFICATION_COOLDOWN_DAYS || '15', 10)
);
const nameCooldownDays = Math.max(
  1,
  parseInt(process.env.NAME_UPDATE_COOLDOWN_DAYS || '15', 10)
);

const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
const appUrl = (process.env.APP_URL || 'http://localhost:4000').replace(/\/$/, '');

const minProfileCompletionPercent = Math.min(
  100,
  Math.max(0, Number(process.env.MIN_PROFILE_COMPLETION_PERCENT) || 75)
);

export const appConfig = {
  appEnv: process.env.NODE_ENV,
  frontendUrl,
  appUrl,
  platformGstNumber: platformGstRaw || null as string | null,
  serviceFeePercent: Math.min(100, Math.max(0, Number(serviceFeePercentRaw) || 10)),
  appFeeFounder: Math.max(0, Number(appFeeFounderRaw) || 100),
  gstPercent: Math.min(100, Math.max(0, Number(gstPercentRaw) || 18)),
  razorpayPlatformAccountId: razorpayPlatformAccountRaw || null as string | null,
  verification: {
    identityCooldownDays,
    agencyCooldownDays,
    taxCooldownDays,
    bankCooldownDays,
    nameCooldownDays,
  },
  /** Minimum profile completion % required to perform gated actions. */
  minProfileCompletionPercent,
};
