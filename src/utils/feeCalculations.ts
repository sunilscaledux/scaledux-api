import { appConfig } from '@config/app';

const round = (n: number) => Math.round(n * 100) / 100;

/**
 * Calculate platform fee based on config (flat or percentage).
 */
export function getPlatformFee(milestoneAmount: number): { base: number; gst: number; total: number } {
  const gstRate = appConfig.gstPercent / 100;
  let base: number;
  if (appConfig.platformFeeType === 'percentage') {
    base = round(milestoneAmount * (appConfig.platformFeeAmount / 100));
  } else {
    base = round(appConfig.platformFeeAmount);
  }
  const gst = round(base * gstRate);
  return { base, gst, total: round(base + gst) };
}

/**
 * What the founder pays for a milestone (milestone amount + platform fee + GST).
 */
export function calcFounderTotal(milestoneAmount: number): {
  milestoneAmount: number;
  platformFee: number;
  platformFeeGst: number;
  totalClientPays: number;
} {
  const pf = getPlatformFee(milestoneAmount);
  return {
    milestoneAmount,
    platformFee: pf.base,
    platformFeeGst: pf.gst,
    totalClientPays: round(milestoneAmount + pf.total),
  };
}

/**
 * Calculate all deductions from freelancer payout.
 */
export function calcFreelancerDeductions(milestoneAmount: number, isGstRegistered: boolean): {
  commission: number;
  commissionGst: number;
  processingFee: number;
  processingFeeGst: number;
  tcs: number;
  totalDeductions: number;
} {
  const gstRate = appConfig.gstPercent / 100;
  const commission = round(milestoneAmount * (appConfig.serviceFeePercent / 100));
  const commissionGst = round(commission * gstRate);
  const processingFee = round(milestoneAmount * (appConfig.processingFeePercent / 100));
  const processingFeeGst = round(processingFee * gstRate);
  const tcs = isGstRegistered ? round(milestoneAmount * (appConfig.tcsPercent / 100)) : 0;
  const totalDeductions = round(commission + commissionGst + processingFee + processingFeeGst + tcs);
  return { commission, commissionGst, processingFee, processingFeeGst, tcs, totalDeductions };
}

/**
 * Net payout to freelancer after all deductions.
 */
export function calcFreelancerPayout(milestoneAmount: number, isGstRegistered: boolean): number {
  const { totalDeductions } = calcFreelancerDeductions(milestoneAmount, isGstRegistered);
  return round(milestoneAmount - totalDeductions);
}

/**
 * Full transaction breakdown for a milestone payment.
 */
export function calcTransaction(milestoneAmount: number, isGstRegistered: boolean) {
  const founder = calcFounderTotal(milestoneAmount);
  const deductions = calcFreelancerDeductions(milestoneAmount, isGstRegistered);
  const freelancerPayout = round(milestoneAmount - deductions.totalDeductions);

  return {
    // Founder side
    milestoneAmount,
    platformFee: founder.platformFee,
    platformFeeGst: founder.platformFeeGst,
    totalClientPays: founder.totalClientPays,
    // Freelancer side
    ...deductions,
    freelancerPayout,
    // Config (for display)
    serviceFeePercent: appConfig.serviceFeePercent,
    processingFeePercent: appConfig.processingFeePercent,
    gstPercent: appConfig.gstPercent,
    tcsPercent: appConfig.tcsPercent,
    platformFeeType: appConfig.platformFeeType,
    platformFeeAmount: appConfig.platformFeeAmount,
  };
}
