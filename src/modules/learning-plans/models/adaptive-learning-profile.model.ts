import mongoose, { Document, Model, Schema } from 'mongoose';
import { AdaptiveRiskLevel } from '../adaptive-mastery.service';
import { AdaptiveSkillKey } from '../adaptive-learning.config';
import type { AdaptivePlanScope } from '../adaptive-plan.types';

export type AdaptiveLearningGoal = 'COMPLETE_COURSE' | 'INTERVIEW_PREP' | 'BUILD_PROJECT';

export interface IAdaptiveSkillScore {
  skillKey: AdaptiveSkillKey;
  label: string;
  score: number;
  confidence: number;
  correctAnswers: number;
  totalQuestions: number;
}

export type AdaptivePlanSource = 'GEMINI' | 'RULE_ENGINE';

export interface IAdaptivePlanLesson {
  lessonId: mongoose.Types.ObjectId;
  slug: string;
  title: string;
  estimatedMinutes: number;
  isReview: boolean;
}

export interface IAdaptivePlanWeek {
  week: number;
  focusSkillKey: AdaptiveSkillKey;
  focusLabel: string;
  lessons: IAdaptivePlanLesson[];
  goal: string;
  reason: string;
  estimatedMinutes: number;
}

export interface IAdaptivePlanSnapshot {
  version: number;
  diagnosticVersion: number;
  goal: AdaptiveLearningGoal;
  scope: AdaptivePlanScope;
  coverage: {
    selectedLessons: number;
    totalRemainingLessons: number;
    percentage: number;
  };
  generatedBy: AdaptivePlanSource;
  modelName?: string;
  fallbackReason?: string;
  summary: string;
  strengths: string[];
  weaknesses: Array<{ skillKey: AdaptiveSkillKey; reason: string }>;
  weeklyPlan: IAdaptivePlanWeek[];
  nextBestLessonId: mongoose.Types.ObjectId;
  coachMessage: string;
  generatedAt: Date;
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
  planVersion: number;
  latestPlan?: IAdaptivePlanSnapshot;
  planVersions: IAdaptivePlanSnapshot[];
  assessedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AdaptiveSkillScoreSchema = new Schema<IAdaptiveSkillScore>(
  {
    skillKey: {
      type: String,
      enum: ['RUNTIME_EVENT_LOOP', 'ASYNC_PRIMITIVES', 'RACE_SAFE_PATTERNS', 'JOB_QUEUE_CAPSTONE'],
      required: true,
    },
    label: { type: String, required: true },
    score: { type: Number, required: true, min: 0, max: 100 },
    confidence: { type: Number, required: true, min: 0, max: 100 },
    correctAnswers: { type: Number, required: true, min: 0 },
    totalQuestions: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const AdaptivePlanLessonSchema = new Schema<IAdaptivePlanLesson>(
  {
    lessonId: { type: Schema.Types.ObjectId, ref: 'Lesson', required: true },
    slug: { type: String, required: true },
    title: { type: String, required: true },
    estimatedMinutes: { type: Number, required: true, min: 0 },
    isReview: { type: Boolean, required: true },
  },
  { _id: false }
);

const AdaptivePlanWeekSchema = new Schema<IAdaptivePlanWeek>(
  {
    week: { type: Number, required: true, min: 1, max: 24 },
    focusSkillKey: {
      type: String,
      enum: ['RUNTIME_EVENT_LOOP', 'ASYNC_PRIMITIVES', 'RACE_SAFE_PATTERNS', 'JOB_QUEUE_CAPSTONE'],
      required: true,
    },
    focusLabel: { type: String, required: true },
    lessons: { type: [AdaptivePlanLessonSchema], required: true },
    goal: { type: String, required: true },
    reason: { type: String, required: true },
    estimatedMinutes: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const AdaptivePlanSnapshotSchema = new Schema<IAdaptivePlanSnapshot>(
  {
    version: { type: Number, required: true, min: 1 },
    diagnosticVersion: { type: Number, required: true, min: 1 },
    goal: {
      type: String,
      enum: ['COMPLETE_COURSE', 'INTERVIEW_PREP', 'BUILD_PROJECT'],
      required: true,
    },
    scope: { type: String, enum: ['FULL_COURSE', 'FOCUSED'], required: true },
    coverage: {
      type: new Schema(
        {
          selectedLessons: { type: Number, required: true, min: 0 },
          totalRemainingLessons: { type: Number, required: true, min: 0 },
          percentage: { type: Number, required: true, min: 0, max: 100 },
        },
        { _id: false },
      ),
      required: true,
    },
    generatedBy: { type: String, enum: ['GEMINI', 'RULE_ENGINE'], required: true },
    modelName: { type: String },
    fallbackReason: { type: String },
    summary: { type: String, required: true },
    strengths: { type: [String], default: [] },
    weaknesses: {
      type: [
        new Schema(
          {
            skillKey: { type: String, required: true },
            reason: { type: String, required: true },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
    weeklyPlan: { type: [AdaptivePlanWeekSchema], required: true },
    nextBestLessonId: { type: Schema.Types.ObjectId, ref: 'Lesson', required: true },
    coachMessage: { type: String, required: true },
    generatedAt: { type: Date, required: true },
  },
  { _id: false }
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
    planVersion: { type: Number, required: true, min: 0, default: 0 },
    latestPlan: { type: AdaptivePlanSnapshotSchema },
    planVersions: { type: [AdaptivePlanSnapshotSchema], default: [] },
    assessedAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true }
);

AdaptiveLearningProfileSchema.index({ userId: 1, courseId: 1 }, { unique: true });

export const AdaptiveLearningProfile: Model<IAdaptiveLearningProfile> =
  mongoose.models.AdaptiveLearningProfile ||
  mongoose.model<IAdaptiveLearningProfile>(
    'AdaptiveLearningProfile',
    AdaptiveLearningProfileSchema
  );
