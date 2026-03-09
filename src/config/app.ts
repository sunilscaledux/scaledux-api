/**
 * App / billing config from env.
 * PLATFORM_GST_NUMBER, SERVICE_FEE_PERCENT, APP_FEE_FOUNDER, GST_PERCENT.
 */
const platformGstRaw = (process.env.PLATFORM_GST_NUMBER ?? process.env.GST_NUMBER ?? '').trim();
const serviceFeePercentRaw = process.env.SERVICE_FEE_PERCENT;
const appFeeFounderRaw = process.env.APP_FEE_FOUNDER;
const gstPercentRaw = process.env.GST_PERCENT;

export const appConfig = {
  /** Platform GSTIN (for invoices). */
  platformGstNumber: platformGstRaw || null as string | null,

  /** Service fee percent (0–100) deducted from freelancer at release. Default 10. */
  serviceFeePercent: Math.min(100, Math.max(0, Number(serviceFeePercentRaw) || 10)),

  /** App fee (flat) charged to founder per payment. Default 100. */
  appFeeFounder: Math.max(0, Number(appFeeFounderRaw) || 100),

  /** GST percent (0–100) applied on app fee (founder) and on service charge (freelancer). Default 0. */
  gstPercent: Math.min(100, Math.max(0, Number(gstPercentRaw) || 18)),
};
