import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export interface IDiscussionReaction extends Document {
  commentId: Types.ObjectId;
  userId: Types.ObjectId;
  type: 'HELPFUL';
  createdAt: Date;
}

const DiscussionReactionSchema = new Schema<IDiscussionReaction>(
  {
    commentId: { type: Schema.Types.ObjectId, ref: 'Comment', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['HELPFUL'], required: true, default: 'HELPFUL' },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

DiscussionReactionSchema.index({ commentId: 1, userId: 1, type: 1 }, { unique: true });

export const DiscussionReaction: Model<IDiscussionReaction> =
  mongoose.models.DiscussionReaction || mongoose.model<IDiscussionReaction>('DiscussionReaction', DiscussionReactionSchema);
