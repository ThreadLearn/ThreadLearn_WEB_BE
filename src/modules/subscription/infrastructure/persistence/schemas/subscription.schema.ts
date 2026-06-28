import mongoose, { Document, Model, Schema } from 'mongoose';
import { SubscriptionStatus } from '../../../domain/entities/subscription.entity';

export interface ISubscriptionDocument extends Document {
  userId: mongoose.Types.ObjectId;
  planId: mongoose.Types.ObjectId;
  status: SubscriptionStatus;
  startedAt: Date;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SubscriptionSchema = new Schema<ISubscriptionDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    planId: { type: Schema.Types.ObjectId, ref: 'SubscriptionPlan', required: true },
    status: { type: String, enum: ['active', 'expired', 'cancelled'], default: 'active', index: true },
    startedAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true, index: true },
  },
  { timestamps: true },
);

export const SubscriptionModel: Model<ISubscriptionDocument> =
  mongoose.models.UserSubscription || mongoose.model<ISubscriptionDocument>('UserSubscription', SubscriptionSchema);
