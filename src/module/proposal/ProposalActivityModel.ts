import mongoose, { Schema, Document, Model } from 'mongoose';

export type ProposalActivityType = 'STATUS_CHANGE' | 'REQUEST_MODIFY' | 'CONTENT_UPDATE' | 'MILESTONE_PAYMENT' | 'HIRE_PAYMENT' | 'MILESTONE_SUBMITTED';

export interface IProposalActivityPayload {
  oldStatus?: string;
  newStatus?: string;
  message?: string;
  oldSnapshot?: Record<string, unknown>;
  /** Payment activities */
  milestoneIndex?: number;
  milestoneTitle?: string;
  amount?: number;
  deliverableDescription?: string;
}

export interface IProposalActivity extends Document {
  proposalUniqueId: string;
  type: ProposalActivityType;
  payload: IProposalActivityPayload;
  createdByUserId: number;
  createdAt: Date;
}

const ProposalActivitySchema = new Schema<IProposalActivity>(
  {
    proposalUniqueId: { type: String, required: true, index: true },
    type: { type: String, required: true, enum: ['STATUS_CHANGE', 'REQUEST_MODIFY', 'CONTENT_UPDATE', 'MILESTONE_PAYMENT', 'HIRE_PAYMENT', 'MILESTONE_SUBMITTED'] },
    payload: { type: Schema.Types.Mixed, required: true },
    createdByUserId: { type: Number, required: true },
    createdAt: { type: Date, default: Date.now }
  },
  { collection: 'proposal_activities' }
);

ProposalActivitySchema.index({ proposalUniqueId: 1, createdAt: -1 });

export const ProposalActivity: Model<IProposalActivity> =
  mongoose.models.ProposalActivity ??
  mongoose.model<IProposalActivity>('ProposalActivity', ProposalActivitySchema);
