import mongoose, { Schema, Document, Model } from 'mongoose';

/** Subject of the activity: Proposal, FounderProject, etc. Add more as needed. */
export type ActivitySubjectType = 'Proposal' | 'FounderProject' | string;

export interface IActivity extends Document {
  subjectType: ActivitySubjectType;
  subjectUniqueId: string;
  type: string;
  payload: Record<string, unknown>;
  createdByUserId: number;
  createdAt: Date;
}

const ActivitySchema = new Schema<IActivity>(
  {
    subjectType: { type: String, required: true, index: true },
    subjectUniqueId: { type: String, required: true, index: true },
    type: { type: String, required: true },
    payload: { type: Schema.Types.Mixed, required: true },
    createdByUserId: { type: Number, required: true },
    createdAt: { type: Date, default: Date.now }
  },
  { collection: 'activities' }
);

ActivitySchema.index({ subjectType: 1, subjectUniqueId: 1, createdAt: -1 });

export const Activity: Model<IActivity> =
  mongoose.models.Activity ?? mongoose.model<IActivity>('Activity', ActivitySchema);
