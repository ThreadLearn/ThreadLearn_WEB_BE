import mongoose, { Document, Model, Schema } from 'mongoose';

export interface ICourseReview extends Document {
  userId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  rating: number;
  content?: string;
  helpfulCount: number;
  status: 'active' | 'hidden' | 'deleted';
  createdAt: Date;
  updatedAt: Date;
}

const CourseReviewSchema = new Schema<ICourseReview>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    content: { type: String, trim: true, maxlength: 2000 },
    helpfulCount: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: ['active', 'hidden', 'deleted'], default: 'active', index: true },
  },
  { timestamps: true }
);

CourseReviewSchema.index({ userId: 1, courseId: 1 }, { unique: true });
CourseReviewSchema.index({ courseId: 1, status: 1, createdAt: -1 });

export const CourseReview: Model<ICourseReview> =
  mongoose.models.CourseReview ||
  mongoose.model<ICourseReview>('CourseReview', CourseReviewSchema);

export default CourseReview;
