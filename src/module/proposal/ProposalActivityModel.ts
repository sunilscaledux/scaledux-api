/** Types for proposal activity (storage is in Postgres Activity table). */
export type ProposalActivityType = 'STATUS_CHANGE' | 'REQUEST_MODIFY' | 'CONTENT_UPDATE' | 'MILESTONE_PAYMENT' | 'HIRE_PAYMENT' | 'MILESTONE_SUBMITTED' | 'NDA_UPDATE' | 'INVOICE_REQUESTED' | 'INVOICE_SENT' | 'PAYMENT_RELEASED';

export interface IProposalActivityPayload {
  oldStatus?: string;
  newStatus?: string;
  message?: string;
  /** Predefined reason key (e.g. BUDGET_MISMATCH) for decline/withdraw/terminate */
  main_reason?: string;
  oldSnapshot?: Record<string, unknown>;
  /** Payment activities */
  milestoneIndex?: number;
  milestoneTitle?: string;
  amount?: number;
  deliverableDescription?: string;
  /** Transaction id (e.g. billing transaction unique_id) for payment activities */
  transactionId?: string;
  /** MILESTONE_SUBMITTED: remark and file links */
  remark?: string;
  submittedFileUrls?: { url: string; name?: string }[];
  /** NDA_UPDATE: the document the founder replaced, and the one replacing it */
  oldNdaFileLink?: string | null;
  newNdaFileLink?: string | null;
}

export interface IProposalActivity {
  proposalUniqueId: string;
  type: ProposalActivityType;
  payload: IProposalActivityPayload;
  createdByUserId: number;
  createdAt: Date;
}
