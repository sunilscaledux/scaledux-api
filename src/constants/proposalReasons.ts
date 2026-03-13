/**
 * Predefined reason options for proposal/offer/contract actions.
 * Plain strings: used as both display and stored value (main_reason). Frontend fetches via GET /proposals/reasons?key=<key>.
 */

/** Founder declining a proposal (status → REJECTED) */
export const PROPOSAL_DECLINE_REASONS: string[] = [
  "Budget doesn't fit",
  "Not a relevant fit",
  "Found another freelancer",
  "Project cancelled or on hold",
  "Other"
];

/** Freelancer declining an offer (offer sent → declined) */
export const OFFER_DECLINE_REASONS: string[] = [
  "Budget is too low",
  "Timeline not feasible",
  "Scope has changed",
  "Accepted another offer",
  "Other"
];

/** Founder withdrawing an offer (cancel hire before NDA signed) */
export const WITHDRAW_OFFER_REASONS: string[] = [
  "Found another freelancer",
  "Project on hold",
  "Budget changed",
  "Other"
];

/** Freelancer withdrawing their proposal (PENDING → WITHDRAWN) */
export const WITHDRAW_PROPOSAL_REASONS: string[] = [
  "Accepted another project",
  "No longer available",
  "Scope doesn't fit",
  "Other"
];

/** Terminate contract (founder or freelancer, HIRED → TERMINATING) */
export const TERMINATE_REASONS: string[] = [
  "Scope completed early",
  "Performance issues",
  "Budget constraints",
  "Mutual agreement",
  "Other"
];

/** Single route: get reasons by key. Valid keys for frontend. */
export const PROPOSAL_REASON_KEYS = [
  "proposalDecline",
  "offerDecline",
  "withdrawOffer",
  "withdrawProposal",
  "terminate"
] as const;

export type ProposalReasonKey = (typeof PROPOSAL_REASON_KEYS)[number];

const REASONS_BY_KEY: Record<ProposalReasonKey, string[]> = {
  proposalDecline: PROPOSAL_DECLINE_REASONS,
  offerDecline: OFFER_DECLINE_REASONS,
  withdrawOffer: WITHDRAW_OFFER_REASONS,
  withdrawProposal: WITHDRAW_PROPOSAL_REASONS,
  terminate: TERMINATE_REASONS
};

export function getReasonsByKey(key: string | undefined): string[] | null {
  if (!key || !PROPOSAL_REASON_KEYS.includes(key as ProposalReasonKey)) return null;
  return REASONS_BY_KEY[key as ProposalReasonKey] ?? null;
}
