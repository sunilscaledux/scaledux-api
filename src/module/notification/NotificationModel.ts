import mongoose, { Schema, Document, Model } from 'mongoose';

export interface INotification extends Document {
  userId: number;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  readAt: Date | null;
  actorId: number | null;
  subjectType: string | null;
  subjectId: number | null;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: { type: Number, required: true, index: true },
    type: { type: String, required: true },
    title: { type: String, required: true },
    body: { type: String, default: null },
    link: { type: String, default: null },
    readAt: { type: Date, default: null },
    actorId: { type: Number, default: null },
    subjectType: { type: String, default: null },
    subjectId: { type: Number, default: null },
    createdAt: { type: Date, default: Date.now }
  },
  { collection: 'notifications' }
);

NotificationSchema.index({ userId: 1, readAt: 1 });
NotificationSchema.index({ userId: 1, createdAt: -1 });

export const Notification: Model<INotification> =
  mongoose.models.Notification ??
  mongoose.model<INotification>('Notification', NotificationSchema);
