import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICourse extends Document {
  title: string;
  description: string;
  coverImage?: string;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CourseSchema: Schema<ICourse> = new Schema(
  {
    title: { type: String, required: true, trim: true, index: 'text' },
    description: { type: String, required: true, trim: true },
    coverImage: { type: String },
    isPublished: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

export const Course: Model<ICourse> =
  mongoose.models.Course || mongoose.model<ICourse>('Course', CourseSchema);
export default Course;
export { CourseSchema };

