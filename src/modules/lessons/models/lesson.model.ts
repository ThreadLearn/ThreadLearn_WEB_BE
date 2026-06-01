import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ILesson extends Document {
  courseId: mongoose.Types.ObjectId;
  title: string;
  content: string;
  videoUrl?: string;
  attachmentUrl?: string;
  durationMinutes: number;
  order: number;
  isLocked: boolean;
  isFreePreview: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const LessonSchema: Schema<ILesson> = new Schema(
  {
    courseId:        { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    title:           { type: String, required: true, trim: true },
    content:         { type: String, required: true },
    videoUrl:        { type: String },
    attachmentUrl:   { type: String },
    durationMinutes: { type: Number, default: 0, min: 0 },
    order:           { type: Number, required: true, default: 0 },
    isLocked:        { type: Boolean, default: false },
    isFreePreview:   { type: Boolean, default: false }, // UC25 — Guest can view if true
    isDeleted:       { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

LessonSchema.index({ courseId: 1, order: 1 });

export const Lesson: Model<ILesson> =
  mongoose.models.Lesson || mongoose.model<ILesson>('Lesson', LessonSchema);
export default Lesson;
export { LessonSchema };
