import mongoose, { Document, Model, Schema } from 'mongoose';

export interface ILearningPlan extends Document {
  userId: mongoose.Types.ObjectId;
  weeklyHours: number;
  preferredDays: number[];
  targetDate?: Date;
  reminderEnabled: boolean;
  reminderTime: string;
  timezone: string;
  createdAt: Date;
  updatedAt: Date;
}

const LearningPlanSchema = new Schema<ILearningPlan>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    weeklyHours: { type: Number, required: true, min: 1, max: 40, default: 3 },
    preferredDays: { type: [Number], required: true, default: [1, 3, 5] },
    targetDate: { type: Date },
    reminderEnabled: { type: Boolean, default: true },
    reminderTime: { type: String, required: true, default: '19:00' },
    timezone: { type: String, required: true, default: 'Asia/Ho_Chi_Minh' },
  },
  { timestamps: true },
);

export const LearningPlan: Model<ILearningPlan> =
  mongoose.models.LearningPlan || mongoose.model<ILearningPlan>('LearningPlan', LearningPlanSchema);
