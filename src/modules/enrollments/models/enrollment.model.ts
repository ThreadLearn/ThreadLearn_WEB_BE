import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IEnrollment extends Document {
  userId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  progress: number;
  progressPercent?: number;
  completedLessons: mongoose.Types.ObjectId[];
  totalLessons?: number;
  lastLessonId?: mongoose.Types.ObjectId;
  completed: boolean;
  completedAt?: Date;
  enrolledAt: Date;
  lastAccessedAt?: Date;
  updatedAt: Date;
}

const EnrollmentSchema: Schema<IEnrollment> = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    progressPercent: { type: Number, default: 0, min: 0, max: 100 },
    completedLessons: [{ type: Schema.Types.ObjectId, ref: 'Lesson', default: [] }],
    totalLessons: { type: Number, default: 0, min: 0 },
    lastLessonId: { type: Schema.Types.ObjectId, ref: 'Lesson' },
    completed: { type: Boolean, default: false },
    completedAt: { type: Date },
    enrolledAt: { type: Date, default: Date.now },
    lastAccessedAt: { type: Date },
  },
  { timestamps: true }
);

EnrollmentSchema.index({ userId: 1, courseId: 1 }, { unique: true });

export const Enrollment: Model<IEnrollment> =
  mongoose.models.Enrollment || mongoose.model<IEnrollment>('Enrollment', EnrollmentSchema);
export default Enrollment;
