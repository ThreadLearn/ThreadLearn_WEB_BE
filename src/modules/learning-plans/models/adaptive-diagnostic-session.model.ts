import mongoose, { Document, Model, Schema } from 'mongoose';
import { AdaptiveSkillKey } from '../adaptive-learning.config';

export type AdaptiveDiagnosticSource = 'GEMINI' | 'QUESTION_BANK';

export interface IAdaptiveDiagnosticSessionQuestion {
  id: string;
  skillKey: AdaptiveSkillKey;
  questionText: string;
  options: string[];
  correctAnswerIndex: number;
}

export interface IAdaptiveDiagnosticSession extends Document {
  userId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  courseSlug: string;
  source: AdaptiveDiagnosticSource;
  modelName?: string;
  questions: IAdaptiveDiagnosticSessionQuestion[];
  expiresAt: Date;
  usedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AdaptiveDiagnosticSessionQuestionSchema = new Schema<IAdaptiveDiagnosticSessionQuestion>(
  {
    id: { type: String, required: true },
    skillKey: {
      type: String,
      enum: ['RUNTIME_EVENT_LOOP', 'ASYNC_PRIMITIVES', 'RACE_SAFE_PATTERNS', 'JOB_QUEUE_CAPSTONE'],
      required: true,
    },
    questionText: { type: String, required: true },
    options: { type: [String], required: true },
    correctAnswerIndex: { type: Number, required: true, min: 0, max: 3 },
  },
  { _id: false },
);

const AdaptiveDiagnosticSessionSchema = new Schema<IAdaptiveDiagnosticSession>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    courseSlug: { type: String, required: true, trim: true, lowercase: true },
    source: { type: String, enum: ['GEMINI', 'QUESTION_BANK'], required: true },
    modelName: { type: String },
    questions: { type: [AdaptiveDiagnosticSessionQuestionSchema], required: true },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date },
  },
  { timestamps: true },
);

AdaptiveDiagnosticSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
AdaptiveDiagnosticSessionSchema.index({ userId: 1, courseId: 1, usedAt: 1 });

export const AdaptiveDiagnosticSession: Model<IAdaptiveDiagnosticSession> =
  mongoose.models.AdaptiveDiagnosticSession ||
  mongoose.model<IAdaptiveDiagnosticSession>(
    'AdaptiveDiagnosticSession',
    AdaptiveDiagnosticSessionSchema,
  );
