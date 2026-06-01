import mongoose, { Schema, Document, Model } from 'mongoose';

/** UC56/UC57 — Đánh giá khoá học. */
export interface ICourseReview extends Document {
  userId:        mongoose.Types.ObjectId;
  courseId:      mongoose.Types.ObjectId;
  rating:        1 | 2 | 3 | 4 | 5;
  content:       string;
  helpfulCount:  number;
  status:        'active' | 'hidden';
  createdAt:     Date;
  updatedAt:     Date;
}

const CourseReviewSchema: Schema<ICourseReview> = new Schema(
  {
    userId:       { type: Schema.Types.ObjectId, ref: 'User',   required: true, index: true },
    courseId:     { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    rating:       { type: Number, min: 1, max: 5, required: true },
    content:      { type: String, trim: true, default: '' },
    helpfulCount: { type: Number, default: 0 },
    status:       { type: String, enum: ['active', 'hidden'], default: 'active' },
  },
  { timestamps: true },
);
// 1 user — 1 review / 1 course
CourseReviewSchema.index({ userId: 1, courseId: 1 }, { unique: true });

export const CourseReview: Model<ICourseReview> =
  mongoose.models.CourseReview
  || mongoose.model<ICourseReview>('CourseReview', CourseReviewSchema);
export { CourseReviewSchema };
export default CourseReview;
