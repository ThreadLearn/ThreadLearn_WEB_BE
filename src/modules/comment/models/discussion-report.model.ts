import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export type DiscussionReportReason = 'SPAM' | 'ABUSE' | 'INCORRECT' | 'SPOILER' | 'UNSAFE_CODE' | 'OTHER';

export interface IDiscussionReport extends Document {
  commentId: Types.ObjectId;
  reporterId: Types.ObjectId;
  reason: DiscussionReportReason;
  details?: string;
  status: 'OPEN' | 'RESOLVED';
  createdAt: Date;
}

const DiscussionReportSchema = new Schema<IDiscussionReport>(
  {
    commentId: { type: Schema.Types.ObjectId, ref: 'Comment', required: true, index: true },
    reporterId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    reason: { type: String, enum: ['SPAM', 'ABUSE', 'INCORRECT', 'SPOILER', 'UNSAFE_CODE', 'OTHER'], required: true },
    details: { type: String, maxlength: 1000 },
    status: { type: String, enum: ['OPEN', 'RESOLVED'], default: 'OPEN', index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

DiscussionReportSchema.index({ commentId: 1, reporterId: 1 }, { unique: true });

export const DiscussionReport: Model<IDiscussionReport> =
  mongoose.models.DiscussionReport || mongoose.model<IDiscussionReport>('DiscussionReport', DiscussionReportSchema);
