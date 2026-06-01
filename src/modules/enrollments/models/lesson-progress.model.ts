import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * UC27/UC28 — per-lesson completion record.
 * One row per (userId, lessonId). Used to recompute enrollment.progress.
 */
export interface ILessonProgress extends Document {
  userId:      mongoose.Types.ObjectId;
  lessonId:    mongoose.Types.ObjectId;
  courseId:    mongoose.Types.ObjectId;
  completedAt: Date;
}

const LessonProgressSchema: Schema<ILessonProgress> = new Schema(
  {
    userId:      { type: Schema.Types.ObjectId, ref: 'User',   required: true },
    lessonId:    { type: Schema.Types.ObjectId, ref: 'Lesson', required: true },
    courseId:    { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    completedAt: { type: Date, default: () => new Date() },
  },
  { timestamps: false },
);

LessonProgressSchema.index({ userId: 1, lessonId: 1 }, { unique: true });
LessonProgressSchema.index({ userId: 1, courseId: 1 });

export const LessonProgress: Model<ILessonProgress> =
  mongoose.models.LessonProgress
  || mongoose.model<ILessonProgress>('LessonProgress', LessonProgressSchema);
export default LessonProgress;
export { LessonProgressSchema };
