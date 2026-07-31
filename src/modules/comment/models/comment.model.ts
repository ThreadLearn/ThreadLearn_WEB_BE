import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export type CommentTargetType = 'COURSE' | 'LESSON';
export type CommentStatus     = 'active' | 'hidden' | 'deleted';
export type CommentPostType = 'GENERAL' | 'QUESTION' | 'CODE_HELP' | 'CODE_REVIEW' | 'EXPLANATION_REQUEST' | 'CODE_SOLUTION';
export type CommentQuestionStatus = 'OPEN' | 'SOLVED' | 'CLOSED';

export interface IComment extends Document {
  targetType: CommentTargetType;
  targetId:   Types.ObjectId | string;
  lessonId?:  Types.ObjectId;
  courseId?:  Types.ObjectId;
  userId:     Types.ObjectId;
  parentId?:  Types.ObjectId | null;
  content:    string;
  isAnonymous: boolean;
  status:     CommentStatus;
  isEdited:   boolean;
  editedAt?:  Date;
  createdAt:  Date;
  updatedAt:  Date;
  deletedAt?: Date;
  reactionCount?: number;
  helpfulCount?: number;
  replyCount?: number;
  mentionUserIds?: Types.ObjectId[];
  postType?: CommentPostType;
  questionStatus?: CommentQuestionStatus;
  codeShareId?: Types.ObjectId;
  acceptedReplyId?: Types.ObjectId;
  learningContext?: { expectedResult?: string; actualResult?: string; tried?: string };
  instructorVerifiedAt?: Date;
  instructorVerifiedBy?: Types.ObjectId;
}

const CommentSchema: Schema<IComment> = new Schema(
  {
    targetType: { type: String, enum: ['COURSE', 'LESSON'], required: true },
    targetId:   { type: Schema.Types.ObjectId, required: true, index: true },
    lessonId:   { type: Schema.Types.ObjectId, ref: 'Lesson', index: true },
    courseId:   { type: Schema.Types.ObjectId, ref: 'Course', index: true },
    userId:     { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    parentId:   { type: Schema.Types.ObjectId, ref: 'Comment', default: null },
    content:    { type: String, required: true, trim: true, maxlength: 2000 },
    isAnonymous: { type: Boolean, default: false },
    status:     { type: String, enum: ['active', 'hidden', 'deleted'], default: 'active' },
    isEdited:   { type: Boolean, default: false },
    editedAt:   { type: Date },
    deletedAt:  { type: Date },
    reactionCount: { type: Number, default: 0, min: 0 },
    helpfulCount: { type: Number, default: 0, min: 0 },
    replyCount: { type: Number, default: 0, min: 0 },
    mentionUserIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    postType: {
      type: String,
      enum: ['GENERAL', 'QUESTION', 'CODE_HELP', 'CODE_REVIEW', 'EXPLANATION_REQUEST', 'CODE_SOLUTION'],
      default: 'GENERAL',
    },
    questionStatus: { type: String, enum: ['OPEN', 'SOLVED', 'CLOSED'], default: 'OPEN' },
    codeShareId: { type: Schema.Types.ObjectId, ref: 'CodeShare', index: true },
    acceptedReplyId: { type: Schema.Types.ObjectId, ref: 'Comment' },
    learningContext: {
      expectedResult: { type: String, maxlength: 1000 },
      actualResult: { type: String, maxlength: 1000 },
      tried: { type: String, maxlength: 1000 },
    },
    instructorVerifiedAt: { type: Date },
    instructorVerifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

CommentSchema.index({ targetType: 1, targetId: 1, parentId: 1, createdAt: -1 });
CommentSchema.index({ targetType: 1, targetId: 1, parentId: 1, status: 1, createdAt: -1 });
CommentSchema.index({ targetType: 1, targetId: 1, questionStatus: 1, createdAt: -1 });
CommentSchema.index({ targetType: 1, targetId: 1, helpfulCount: -1, createdAt: -1 });

export const Comment: Model<IComment> =
  mongoose.models.Comment || mongoose.model<IComment>('Comment', CommentSchema);
export { CommentSchema };
export default Comment;
