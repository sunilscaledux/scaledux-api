/**
 * App / billing config from env.
 * Fee structure, GST, platform account, Razorpay config.
 */
const platformGstRaw = (process.env.PLATFORM_GST_NUMBER ?? process.env.GST_NUMBER ?? '').trim();
const serviceFeePercentRaw = process.env.SERVICE_FEE_PERCENT;
const appFeeFounderRaw = process.env.APP_FEE_FOUNDER;
const gstPercentRaw = process.env.GST_PERCENT;
const razorpayPlatformAccountRaw = (process.env.RAZORPAY_PLATFORM_ACCOUNT_ID ?? '').trim();
const bookingServiceFeePercentRaw = process.env.BOOKING_SERVICE_FEE_PERCENT;
const bookingPlatformFeePercentRaw = process.env.BOOKING_PLATFORM_FEE_PERCENT;
const platformFeeTypeRaw = (process.env.PLATFORM_FEE_TYPE ?? 'flat').trim().toLowerCase();
const platformFeeAmountRaw = process.env.PLATFORM_FEE_AMOUNT;
const processingFeePercentRaw = process.env.PROCESSING_FEE_PERCENT;
const tcsPercentRaw = process.env.TCS_PERCENT;
const razorpayWebhookSecretRaw = (process.env.RAZORPAY_WEBHOOK_SECRET ?? '').trim();

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
const minProjectBudget = Math.max(1, parseInt(process.env.MIN_PROJECT_BUDGET || '500', 10));

export const appConfig = {
  appEnv: process.env.NODE_ENV,
  frontendUrl,
  appUrl,
  platformGstNumber: platformGstRaw || null as string | null,
  /** @deprecated Use platformFeeType + platformFeeAmount instead */
  appFeeFounder: Math.max(0, Number(appFeeFounderRaw) || 100),
  serviceFeePercent: Math.min(100, Math.max(0, Number(serviceFeePercentRaw) || 10)),
  /** Booking service fee deducted from mentor payout (%). Default 10. */
  bookingServiceFeePercent: Math.min(100, Math.max(0, Number(bookingServiceFeePercentRaw) || 10)),
  /** Booking platform fee charged to booker (%). Default 0. */
  bookingPlatformFeePercent: Math.min(100, Math.max(0, Number(bookingPlatformFeePercentRaw) || 0)),
  gstPercent: Math.min(100, Math.max(0, Number(gstPercentRaw) || 18)),
  /** Platform fee: "flat" (fixed ₹) or "percentage" (% of milestone amount) */
  platformFeeType: (platformFeeTypeRaw === 'percentage' ? 'percentage' : 'flat') as 'flat' | 'percentage',
  /** Platform fee amount: ₹ if flat, % if percentage. Default 0. */
  platformFeeAmount: Math.max(0, Number(platformFeeAmountRaw) || 0),
  /** Processing fee deducted from freelancer payout (%). Default 1.5. */
  processingFeePercent: Math.min(100, Math.max(0, Number(processingFeePercentRaw) || 1.5)),
  /** TCS rate (%) — only applied if provider is GST registered. Default 0.5. */
  tcsPercent: Math.min(100, Math.max(0, Number(tcsPercentRaw) || 0.5)),
  razorpayPlatformAccountId: razorpayPlatformAccountRaw || null as string | null,
  razorpayWebhookSecret: razorpayWebhookSecretRaw || null as string | null,
  verification: {
    identityCooldownDays,
    agencyCooldownDays,
    taxCooldownDays,
    bankCooldownDays,
    nameCooldownDays,
  },
  /** Minimum profile completion % required to perform gated actions. */
  minProfileCompletionPercent,
  /** Minimum budget (₹) required when posting a project. */
  minProjectBudget,
};
