/**
 * Funding Stage Constants
 * These are the standard funding stages for startups
 * Stored directly as stage names in the database
 */

export const FUNDING_STAGES = [
  'Pre-Seed',
  'Seed',
  'Series A',
  'Series B',
  'Series C',
  'Series D+',
  'Bridge Round',
  'IPO',
  'Bootstrapped',
  'Grant Funded'
] as const;

export type FundingStage = typeof FUNDING_STAGES[number];
