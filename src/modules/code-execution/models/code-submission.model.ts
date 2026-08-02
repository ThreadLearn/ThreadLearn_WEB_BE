import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export type SubmissionStatus = 'QUEUED' | 'JUDGING' | 'GRADED' | 'SYSTEM_ERROR';
export type SubmissionVerdict = 'PASS' | 'PARTIAL' | 'FAIL' | 'ERROR';
export type AiStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'SKIPPED';

export interface ICodeSubmission extends Document {
  exerciseId: Types.ObjectId;
  lessonId: Types.ObjectId;
  courseId?: Types.ObjectId;
  userId: Types.ObjectId;
  attemptNumber: number;
  sourceCode: string;
  language: string;
  executionTime?: string;
  memoryUsage?: number;
  testCasesPassed: number;
  totalTestCases: number;
  score: number;
  submissionStatus: SubmissionStatus;
  verdict?: SubmissionVerdict;
  aiFeedback?: Record<string, unknown>;
  aiStatus: AiStatus;
  testResults: Record<string, unknown>[];
  idempotencyKey?: string;
  countsTowardLimit: boolean;
  similarityResult?: Record<string, unknown>;
  submittedAt: Date;
  completedAt?: Date;
}

const TestResultSchema = new Schema({
  index: { type: Number, required: true },
  passed: { type: Boolean, required: true },
  isHidden: { type: Boolean, required: true },
  input: { type: String },
  expectedOutput: { type: String },
  actualOutput: { type: String },
  runtime: { type: String },
  memory: { type: Number },
  error: { type: String },
}, { _id: false, strict: true });

const CodeSubmissionSchema: Schema<ICodeSubmission> = new Schema({
  exerciseId: { type: Schema.Types.ObjectId, ref: 'Exercise', required: true, index: true },
  lessonId: { type: Schema.Types.ObjectId, ref: 'Lesson', required: true, index: true },
  courseId: { type: Schema.Types.ObjectId, ref: 'Course', index: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  attemptNumber: { type: Number, required: true, min: 1 },
  sourceCode: { type: String, required: true, maxlength: 50000 },
  language: { type: String, required: true, trim: true },
  executionTime: { type: String },
  memoryUsage: { type: Number },
  testCasesPassed: { type: Number, default: 0, min: 0 },
  totalTestCases: { type: Number, default: 0, min: 0 },
  score: { type: Number, default: 0, min: 0, max: 100, index: true },
  submissionStatus: { type: String, enum: ['QUEUED', 'JUDGING', 'GRADED', 'SYSTEM_ERROR'], required: true, index: true },
  verdict: { type: String, enum: ['PASS', 'PARTIAL', 'FAIL', 'ERROR'] },
  aiFeedback: { type: Schema.Types.Mixed },
  aiStatus: { type: String, enum: ['PENDING', 'COMPLETED', 'FAILED', 'SKIPPED'], default: 'PENDING' },
  testResults: { type: [TestResultSchema], default: [] },
  idempotencyKey: { type: String, trim: true },
  countsTowardLimit: { type: Boolean, default: true },
  similarityResult: { type: Schema.Types.Mixed },
  submittedAt: { type: Date, default: Date.now, index: true },
  completedAt: { type: Date },
}, { timestamps: true });

CodeSubmissionSchema.index({ exerciseId: 1, userId: 1, submittedAt: -1 });
CodeSubmissionSchema.index({ exerciseId: 1, score: -1, submittedAt: -1 });
CodeSubmissionSchema.index({ exerciseId: 1, userId: 1, idempotencyKey: 1 }, { unique: true, sparse: true });

export const CodeSubmission: Model<ICodeSubmission> = mongoose.models.CodeSubmission || mongoose.model<ICodeSubmission>('CodeSubmission', CodeSubmissionSchema);

export interface ISubmissionCounter extends Document {
  exerciseId: Types.ObjectId;
  userId: Types.ObjectId;
  usedAttempts: number;
}

const SubmissionCounterSchema = new Schema<ISubmissionCounter>({
  exerciseId: { type: Schema.Types.ObjectId, ref: 'Exercise', required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  usedAttempts: { type: Number, default: 0, min: 0 },
}, { timestamps: true });
SubmissionCounterSchema.index({ exerciseId: 1, userId: 1 }, { unique: true });

export const SubmissionCounter: Model<ISubmissionCounter> = mongoose.models.SubmissionCounter || mongoose.model<ISubmissionCounter>('SubmissionCounter', SubmissionCounterSchema);
