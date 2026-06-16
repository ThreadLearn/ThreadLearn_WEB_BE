import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface ILessonVersion extends Document {
  lessonId: Types.ObjectId;
  version: number;
  contentMarkdown: string;
  createdBy?: Types.ObjectId;
  createdAt: Date;
}

const LessonVersionSchema: Schema<ILessonVersion> = new Schema(
  {
    lessonId: { type: Schema.Types.ObjectId, ref: 'Lesson', required: true, index: true },
    version: { type: Number, required: true },
    contentMarkdown: { type: String, default: '' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

LessonVersionSchema.index({ lessonId: 1, version: -1 });

export const LessonVersion: Model<ILessonVersion> =
  mongoose.models.LessonVersion ||
  mongoose.model<ILessonVersion>('LessonVersion', LessonVersionSchema);
export default LessonVersion;
