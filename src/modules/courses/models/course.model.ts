import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export type CourseStatus = 'draft' | 'published' | 'hidden' | 'archived' | 'deleted';
export type CourseLanguage = 'javascript' | 'java' | 'python';
export type CourseLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

export interface ICourse extends Document {
  title: string;
  slug: string;
  shortDescription?: string;
  description: string;
  thumbnailUrl?: string;
  language: CourseLanguage;
  level: CourseLevel;
  tags: string[];
  category?: string;
  isPremium: boolean;
  price: number;
  status: CourseStatus;
  prerequisites: Types.ObjectId[];
  prerequisiteThreshold: number;
  estimatedDuration: number;
  totalLessons: number;
  totalEnrollments: number;
  averageRating: number;
  totalReviews: number;
  instructorId?: Types.ObjectId;
  createdBy?: Types.ObjectId;
  publishedAt?: Date;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;

  // legacy compatibility
  /** @deprecated Use `thumbnailUrl`; kept until FE migrates. */
  coverImage?: string;
  /** @deprecated Use `status`; kept until FE migrates. */
  isPublished?: boolean;
}

const CourseSchema: Schema<ICourse> = new Schema(
  {
    title: { type: String, required: true, trim: true, index: 'text' },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    shortDescription: { type: String, trim: true, maxlength: 500 },
    description: { type: String, required: true, trim: true },
    thumbnailUrl: { type: String },
    language: { type: String, enum: ['javascript', 'java', 'python'], default: 'javascript', index: true },
    level: { type: String, enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'], default: 'BEGINNER', index: true },
    tags: { type: [String], default: [], index: true },
    category: { type: String, trim: true },
    isPremium: { type: Boolean, default: false, index: true },
    price: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: ['draft', 'published', 'hidden', 'archived', 'deleted'],
      default: 'draft',
      index: true,
    },
    prerequisites: [{ type: Schema.Types.ObjectId, ref: 'Course' }],
    prerequisiteThreshold: { type: Number, default: 80, min: 0, max: 100 },
    estimatedDuration: { type: Number, default: 0, min: 0 },
    totalLessons: { type: Number, default: 0, min: 0 },
    totalEnrollments: { type: Number, default: 0, min: 0 },
    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    totalReviews: { type: Number, default: 0, min: 0 },
    instructorId: { type: Schema.Types.ObjectId, ref: 'User' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    publishedAt: { type: Date },
    deletedAt: { type: Date },
    coverImage: { type: String },
    isPublished: { type: Boolean, default: false },
  },
  { timestamps: true }
);

CourseSchema.index({ status: 1, isPremium: 1, level: 1 });

export const Course: Model<ICourse> =
  mongoose.models.Course || mongoose.model<ICourse>('Course', CourseSchema);
export default Course;
