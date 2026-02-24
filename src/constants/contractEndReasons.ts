/**
 * Reason for ending a contract (private review).
 * Used when submitting a PRIVATE review for PROPOSAL_CONTRACT.
 * Stored in Review.end_reason; validated on submit.
 */

export const CONTRACT_END_REASONS = [
  'Project completed successfully',
  'Service provider was unresponsive',
  'Quality of work was not as expected',
  'Project requirements changed',
  'Other'
] as const;

export type ContractEndReason = (typeof CONTRACT_END_REASONS)[number];

export function isValidContractEndReason(value: string | null | undefined): boolean {
  if (value == null || value === '') return false;
  return (CONTRACT_END_REASONS as readonly string[]).includes(value);
}
