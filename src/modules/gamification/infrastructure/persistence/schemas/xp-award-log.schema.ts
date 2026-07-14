import mongoose, { Document, Model, Schema } from 'mongoose';
import { XpAwardSourceType } from '../../../domain/interfaces/user-stats.repository';

export interface IXpAwardLog extends Document {
  userId: mongoose.Types.ObjectId;
  sourceType: XpAwardSourceType;
  sourceId: string;
  createdAt: Date;
  updatedAt: Date;
}

const XpAwardLogSchema: Schema<IXpAwardLog> = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    sourceType: { type: String, required: true },
    sourceId: { type: String, required: true },
  },
  { timestamps: true },
);

XpAwardLogSchema.index({ sourceType: 1, sourceId: 1 }, { unique: true });

export const XpAwardLog: Model<IXpAwardLog> =
  mongoose.models.XpAwardLog || mongoose.model<IXpAwardLog>('XpAwardLog', XpAwardLogSchema);
export default XpAwardLog;
