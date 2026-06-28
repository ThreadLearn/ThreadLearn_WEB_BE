import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IPlanDocument extends Document {
  name: string;
  description?: string;
  price: number;
  currency: string;
  durationDays: number;
  features: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PlanSchema = new Schema<IPlanDocument>(
  {
    name: { type: String, required: true, trim: true, unique: true, index: true },
    description: { type: String, trim: true },
    price: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, trim: true, default: 'VND' },
    durationDays: { type: Number, required: true, min: 1 },
    features: { type: [String], default: [] },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

export const PlanModel: Model<IPlanDocument> =
  mongoose.models.SubscriptionPlan || mongoose.model<IPlanDocument>('SubscriptionPlan', PlanSchema);
