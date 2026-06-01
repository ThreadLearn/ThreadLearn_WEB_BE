import mongoose, { Schema, Document, Model } from 'mongoose';

export type CourseLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

export interface ICourse extends Document {
  title: string;
  description: string;
  thumbnailUrl?: string;
  coverImage?: string;
  level: CourseLevel;
  category?: string;
  tags: string[];
  price: number;
  durationMinutes: number;
  instructorId?: mongoose.Types.ObjectId;
  isPremium:   boolean;
  isPublished: boolean;
  isDeleted:   boolean;
  totalLessons: number;
  totalEnrollments: number;
  createdAt: Date;
  updatedAt: Date;
}

const CourseSchema: Schema<ICourse> = new Schema(
  {
    title:           { type: String, required: true, trim: true },
    description:     { type: String, required: true, trim: true },
    thumbnailUrl:    { type: String },
    coverImage:      { type: String }, // alias kept for backward compat
    level:           { type: String, enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'], default: 'BEGINNER', index: true },
    category:        { type: String, trim: true, index: true },
    tags:            { type: [String], default: [], index: true },
    price:           { type: Number, default: 0, min: 0 },
    durationMinutes: { type: Number, default: 0 },
    instructorId:    { type: Schema.Types.ObjectId, ref: 'User' },
    isPremium:       { type: Boolean, default: false, index: true },
    isPublished:     { type: Boolean, default: false, index: true },
    isDeleted:       { type: Boolean, default: false, index: true },
    totalLessons:     { type: Number, default: 0 },
    totalEnrollments: { type: Number, default: 0 },
  },
  { timestamps: true },
);

// Text index for UC24 search (BE-friendly fallback when MongoDB Atlas vector
// search isn't available — the same endpoint can swap to $vectorSearch later).
CourseSchema.index({ title: 'text', description: 'text', tags: 'text', category: 'text' });

export const Course: Model<ICourse> =
  mongoose.models.Course || mongoose.model<ICourse>('Course', CourseSchema);
export default Course;
export { CourseSchema };
