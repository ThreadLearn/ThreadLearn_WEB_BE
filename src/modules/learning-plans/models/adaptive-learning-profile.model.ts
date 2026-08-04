import mongoose, { Document, Model, Schema } from 'mongoose';
import { AdaptiveRiskLevel } from '../adaptive-mastery.service';
import { AdaptiveSkillKey } from '../adaptive-learning.config';

export type AdaptiveLearningGoal = 'COMPLETE_COURSE' | 'INTERVIEW_PREP' | 'BUILD_PROJECT';

export interface IAdaptiveSkillScore {
  skillKey: AdaptiveSkillKey;
  label: string;
  score: number;
  confidence: number;
  correctAnswers: number;
  totalQuestions: number;
}

export interface IAdaptiveLearningProfile extends Document {
  userId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  courseSlug: string;
  goal: AdaptiveLearningGoal;
  weeklyHours: number;
  progressPercent: number;
  overallMastery: number;
  confidence: number;
  riskLevel: AdaptiveRiskLevel;
  riskSignals: string[];
  skillScores: IAdaptiveSkillScore[];
  diagnosticAnswers: Record<string, number>;
  diagnosticQuestionCount: number;
  diagnosticCorrectCount: number;
  version: number;
  assessedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AdaptiveSkillScoreSchema = new Schema<IAdaptiveSkillScore>(
  {
    skillKey: {
      type: String,
      enum: [
        'RUNTIME_EVENT_LOOP',
        'ASYNC_PRIMITIVES',
        'RACE_SAFE_PATTERNS',
        'JOB_QUEUE_CAPSTONE',
      ],
      required: true,
    },
    label: { type: String, required: true },
    score: { type: Number, required: true, min: 0, max: 100 },
    confidence: { type: Number, required: true, min: 0, max: 100 },
    correctAnswers: { type: Number, required: true, min: 0 },
    totalQuestions: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const AdaptiveLearningProfileSchema = new Schema<IAdaptiveLearningProfile>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    courseSlug: { type: String, required: true, trim: true, lowercase: true },
    goal: {
      type: String,
      enum: ['COMPLETE_COURSE', 'INTERVIEW_PREP', 'BUILD_PROJECT'],
      required: true,
    },
    weeklyHours: { type: Number, required: true, min: 1, max: 40 },
    progressPercent: { type: Number, required: true, min: 0, max: 100 },
    overallMastery: { type: Number, required: true, min: 0, max: 100 },
    confidence: { type: Number, required: true, min: 0, max: 100 },
    riskLevel: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH'], required: true },
    riskSignals: { type: [String], default: [] },
    skillScores: { type: [AdaptiveSkillScoreSchema], required: true, default: [] },
    diagnosticAnswers: { type: Schema.Types.Mixed, required: true, default: {} },
    diagnosticQuestionCount: { type: Number, required: true, min: 0 },
    diagnosticCorrectCount: { type: Number, required: true, min: 0 },
    version: { type: Number, required: true, min: 1, default: 1 },
    assessedAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true },
);

AdaptiveLearningProfileSchema.index({ userId: 1, courseId: 1 }, { unique: true });

export const AdaptiveLearningProfile: Model<IAdaptiveLearningProfile> =
  mongoose.models.AdaptiveLearningProfile ||
  mongoose.model<IAdaptiveLearningProfile>('AdaptiveLearningProfile', AdaptiveLearningProfileSchema);
