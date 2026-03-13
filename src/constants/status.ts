/**
 * Billing, withdrawal, and proposal status/type constants.
 * Values must match Prisma enums in schema.prisma where applicable.
 * Use these across the application instead of string literals.
 */

// --- Billing transaction & withdrawal ---

export const BillingTransactionType = {
  PAYMENT: 'payment',
  REFUND: 'refund', 
  WITHDRAWAL: 'withdrawal',
} as const;

export type BillingTransactionTypeValue = (typeof BillingTransactionType)[keyof typeof BillingTransactionType];

export const BillingTransactionStatus = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed',
  REFUND: 'refund',
  AVAILABLE: 'available',
  WITHDRAW_IN_PROCESS: 'withdraw_in_process',
} as const;

export type BillingTransactionStatusValue = (typeof BillingTransactionStatus)[keyof typeof BillingTransactionStatus];

export const BillingTransactionSenderStatus = {
  FUNDED: 'funded',
  COMPLETED: 'completed',
  RELEASED: 'released',
} as const;

export type BillingTransactionSenderStatusValue =
  (typeof BillingTransactionSenderStatus)[keyof typeof BillingTransactionSenderStatus];

export const BillingTransactionReceiverStatus = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  RELEASED: 'released',
  WITHDRAW_IN_PROCESS: 'withdraw_in_process',
  PAID_OUT: 'paid_out',
} as const;

export type BillingTransactionReceiverStatusValue =
  (typeof BillingTransactionReceiverStatus)[keyof typeof BillingTransactionReceiverStatus];

export const BillingTransactionAdminStatus = {
  LOADED: 'loaded',
  REFUND: 'refund',
  AVAILABLE: 'available',
  WITHDRAW_IN_PROCESS: 'withdraw_in_process',
  SENT_TO_FREELANCER: 'sent_to_freelancer',
  SUCCESS: 'success',
} as const;

export type BillingTransactionAdminStatusValue =
  (typeof BillingTransactionAdminStatus)[keyof typeof BillingTransactionAdminStatus];

export const WithdrawalRequestStatus = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;

export type WithdrawalRequestStatusValue = (typeof WithdrawalRequestStatus)[keyof typeof WithdrawalRequestStatus];

// --- Proposal status ---

export const ProposalStatus = {
  PENDING: 'PENDING',
  SHORTLISTED: 'SHORTLISTED',
  DECLINED: 'DECLINED',
  ARCHIVED: 'ARCHIVED',
  OFFER_SENT: 'OFFER_SENT',
  OFFER_ACCEPTED: 'OFFER_ACCEPTED',
  HIRED: 'HIRED',
  TERMINATED: 'TERMINATED',
  OFFER_REJECTED: 'OFFER_REJECTED',
  TERMINATING: 'TERMINATING',
  REJECTED: 'REJECTED',
  WITHDRAWN: 'WITHDRAWN',
  PROJECT_COMPLETED: 'PROJECT_COMPLETED',
} as const;

/** ProjectInvite / conversation invite status (PENDING, ACCEPTED, REJECTED). Not proposal status. */
export const InviteStatus = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
  IGNORED: 'IGNORED',
} as const;

export type ProposalStatusValue = (typeof ProposalStatus)[keyof typeof ProposalStatus];

// --- Milestone status (completion: PENDING, IN_PROGRESS, COMPLETED, PAID) ---

export const MilestoneStatus = {
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  PAID: 'PAID',
} as const;

export type MilestoneStatusValue = (typeof MilestoneStatus)[keyof typeof MilestoneStatus];

// --- Milestone payment status (PENDING, FUNDED, RELEASED) ---

export const MilestonePaymentStatus = {
  PENDING: 'PENDING',
  FUNDED: 'FUNDED',
  RELEASED: 'RELEASED',
} as const;

export type MilestonePaymentStatusValue = (typeof MilestonePaymentStatus)[keyof typeof MilestonePaymentStatus];
