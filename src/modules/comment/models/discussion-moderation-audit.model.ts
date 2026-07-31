import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export interface IDiscussionModerationAudit extends Document {
  commentId: Types.ObjectId;
  courseId: Types.ObjectId;
  lessonId?: Types.ObjectId;
  moderatorId: Types.ObjectId;
  action: 'HIDE' | 'RESTORE';
  reason: string;
  createdAt: Date;
}

const DiscussionModerationAuditSchema = new Schema<IDiscussionModerationAudit>(
  {
    commentId: { type: Schema.Types.ObjectId, ref: 'Comment', required: true, immutable: true },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true, immutable: true },
    lessonId: { type: Schema.Types.ObjectId, ref: 'Lesson', immutable: true },
    moderatorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
    action: { type: String, enum: ['HIDE', 'RESTORE'], required: true, immutable: true },
    reason: { type: String, required: true, maxlength: 500, immutable: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

DiscussionModerationAuditSchema.index({ commentId: 1, createdAt: -1 });
DiscussionModerationAuditSchema.index({ courseId: 1, createdAt: -1 });

export const DiscussionModerationAudit: Model<IDiscussionModerationAudit> =
  mongoose.models.DiscussionModerationAudit ||
  mongoose.model<IDiscussionModerationAudit>('DiscussionModerationAudit', DiscussionModerationAuditSchema);

