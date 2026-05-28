import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IComment extends Document {
  targetType: 'COURSE' | 'LESSON';
  targetId: string;
  userId: mongoose.Types.ObjectId;
  parentId?: mongoose.Types.ObjectId | null;
  content: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CommentSchema: Schema<IComment> = new Schema(
  {
    targetType: { type: String, enum: ['COURSE', 'LESSON'], required: true },
    targetId: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    parentId: { type: Schema.Types.ObjectId, ref: 'Comment', default: null },
    content: { type: String, required: true, trim: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

CommentSchema.index({ targetType: 1, targetId: 1 });

export const Comment: Model<IComment> =
  mongoose.models.Comment || mongoose.model<IComment>('Comment', CommentSchema);
export default Comment;
