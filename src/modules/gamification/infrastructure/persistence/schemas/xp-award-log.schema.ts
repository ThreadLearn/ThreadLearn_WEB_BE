import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IXpAwardLog extends Document {
  sourceType: string;
  sourceId: string;
  userId: string;
  createdAt: Date;
}

const XpAwardLogSchema = new Schema<IXpAwardLog>(
  {
    sourceType: { type: String, required: true },
    sourceId: { type: String, required: true },
    userId: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

XpAwardLogSchema.index({ sourceType: 1, sourceId: 1, userId: 1 }, { unique: true });

export const XpAwardLog: Model<IXpAwardLog> =
  mongoose.models.XpAwardLog || mongoose.model<IXpAwardLog>('XpAwardLog', XpAwardLogSchema);

export default XpAwardLog;
