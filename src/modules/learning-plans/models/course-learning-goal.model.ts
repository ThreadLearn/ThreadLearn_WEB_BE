import mongoose, { Document, Model, Schema } from 'mongoose';

export type CourseGoalPriority = 'HIGH' | 'NORMAL' | 'LOW';

export interface ICourseLearningGoal extends Document {
  userId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  enrollmentId: mongoose.Types.ObjectId;
  targetDate: Date;
  priority: CourseGoalPriority;
  createdAt: Date;
  updatedAt: Date;
}

const CourseLearningGoalSchema = new Schema<ICourseLearningGoal>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    enrollmentId: { type: Schema.Types.ObjectId, ref: 'Enrollment', required: true },
    targetDate: { type: Date, required: true, index: true },
    priority: { type: String, enum: ['HIGH', 'NORMAL', 'LOW'], default: 'NORMAL' },
  },
  { timestamps: true }
);

CourseLearningGoalSchema.index({ userId: 1, courseId: 1 }, { unique: true });

export const CourseLearningGoal: Model<ICourseLearningGoal> =
  mongoose.models.CourseLearningGoal ||
  mongoose.model<ICourseLearningGoal>('CourseLearningGoal', CourseLearningGoalSchema);
