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

/**
 * Investor type options for investment profile (id, value, label, description).
 * Served via GET /investor-types for the UI.
 */
export const INVESTOR_TYPES = [
  { id: 'angel-investor', value: 'Angel investor', label: 'Angel investor', description: 'Invest in early-stage startups' },
  { id: 'venture-capitalists', value: 'Venture Capitalists', label: 'Venture Capitalists', description: 'Invest in growth-stage startups' },
  { id: 'micro-vcs', value: 'Micro VCs', label: 'Micro VCs', description: 'Invest in growth-stage startups' },
  { id: 'corporate-investor', value: 'Corporate Investor', label: 'Corporate Investor', description: 'Corporate venture arms and strategic investors' },
  { id: 'syndicate-lead', value: 'Syndicate Lead', label: 'Syndicate Lead', description: 'Lead and manage investment syndicates' },
  { id: 'family-office', value: 'Family Office', label: 'Family Office', description: 'Wealth management and investment for families' },
  { id: 'incubators', value: 'Accelerators / Incubators', label: 'Accelerators / Incubators', description: 'Offer guidance, share experience, and attract founders' }
] as const;

export type InvestorTypeOption = (typeof INVESTOR_TYPES)[number];

/**
 * Served via GET /investment-profile-options. Stages use FUNDING_STAGES / GET /funding-stages.
 */
export const INVESTMENT_CRITERIA_OPTIONS = [
  'Required metrics/traction fields by stage',
  'Business model preference selection',
  'Revenue model requirements',
  'Market size threshold indication',
  'Team composition preferences',
  'Founder background preferences'
] as const;
