/**
 * Startup Stage Constants
 * Stored directly in `company_profile.company_stage` as the stage name.
 * Served via GET /startup-stages for the UI dropdown.
 */

export const STARTUP_STAGES = [
  'Ideation',
  'Prototype / MVP',
  'Early Traction',
  'Revenue Generating',
  'Growth',
  'Scale / Expansion'
] as const;

export type StartupStage = typeof STARTUP_STAGES[number];
