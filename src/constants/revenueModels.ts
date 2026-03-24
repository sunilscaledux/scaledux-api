export const REVENUE_MODELS = [
  'Subscription',
  'Freemium',
  'Transaction Fee',
  'Advertising',
  'Licensing',
  'Marketplace',
  'SaaS',
  'E-commerce',
  'Affiliate',
  'Consulting',
  'Pay-per-use',
  'White Label',
  'Data Monetization',
  'Hybrid',
  'Other'
] as const;

export type RevenueModelName = typeof REVENUE_MODELS[number];
