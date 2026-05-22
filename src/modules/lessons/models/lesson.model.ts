import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ILesson extends Document {
  courseId: mongoose.Types.ObjectId;
  title: string;
  content: string;
  attachmentUrl?: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const LessonSchema: Schema<ILesson> = new Schema(
  {
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    attachmentUrl: { type: String },
    order: { type: Number, required: true, default: 0 },
  },
  { timestamps: true }
);

LessonSchema.index({ courseId: 1, order: 1 });

export const Lesson: Model<ILesson> =
  mongoose.models.Lesson || mongoose.model<ILesson>('Lesson', LessonSchema);
export default Lesson;
