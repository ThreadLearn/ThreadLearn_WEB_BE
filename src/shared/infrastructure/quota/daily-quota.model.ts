import mongoose, { Model, Schema } from 'mongoose';

export interface IDailyQuota {
  userId: mongoose.Types.ObjectId;
  scope: string;
  day: string;
  count: number;
  createdAt: Date;
  updatedAt: Date;
}

const DailyQuotaSchema = new Schema<IDailyQuota>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    scope: { type: String, required: true },
    // UTC calendar day avoids a server-timezone-dependent quota reset.
    day: { type: String, required: true },
    count: { type: Number, required: true, default: 0, min: 0 },
  },
  { timestamps: true },
);

DailyQuotaSchema.index({ userId: 1, scope: 1, day: 1 }, { unique: true });

export const DailyQuota: Model<IDailyQuota> =
  mongoose.models.DailyQuota || mongoose.model<IDailyQuota>('DailyQuota', DailyQuotaSchema);
