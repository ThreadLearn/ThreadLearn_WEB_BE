import mongoose, { Document, Model, Schema } from 'mongoose';
import { PurchaseStatus } from '../../../domain/entities/purchase.entity';

export interface IPurchaseDocument extends Document {
  userId: mongoose.Types.ObjectId;
  planId: mongoose.Types.ObjectId;
  amount: number;
  currency: string;
  status: PurchaseStatus;
  transactionId?: string;
  paymentUrl?: string;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PurchaseSchema = new Schema<IPurchaseDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    planId: { type: Schema.Types.ObjectId, ref: 'SubscriptionPlan', required: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, trim: true },
    status: { type: String, enum: ['pending', 'succeeded', 'failed'], default: 'pending', index: true },
    transactionId: { type: String, index: true },
    paymentUrl: { type: String },
    paidAt: { type: Date },
  },
  { timestamps: true },
);

export const PurchaseModel: Model<IPurchaseDocument> =
  mongoose.models.SubscriptionPurchase || mongoose.model<IPurchaseDocument>('SubscriptionPurchase', PurchaseSchema);
