import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IQuizAttempt extends Document {
  quizId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  score: number;
  answers: Record<string, number>;
  passed: boolean;
  passingScorePercent?: number;
  xpRewarded?: number;
  isTimeout?: boolean;
  sessionId?: mongoose.Types.ObjectId;
  startedAt?: Date;
  completedAt?: Date;
  durationSeconds?: number;
  gradedAt?: Date;
  reviewQuestions?: Array<{
    sourceQuestionId: mongoose.Types.ObjectId;
    questionText: string;
    options: Array<{ optionId: string; text: string }>;
    selectedOptionIndex?: number;
    selectedOptionId?: string;
    correctOptionIndex: number;
    correctOptionId: string;
    isCorrect: boolean;
    explanation?: string;
  }>;
  createdAt: Date;
}

const QuizReviewOptionSchema = new Schema(
  {
    optionId: { type: String, required: true },
    text: { type: String, required: true },
  },
  { _id: false },
);

const QuizReviewQuestionSchema = new Schema(
  {
    sourceQuestionId: { type: Schema.Types.ObjectId, required: true },
    questionText: { type: String, required: true },
    options: { type: [QuizReviewOptionSchema], required: true },
    selectedOptionIndex: { type: Number, min: 0 },
    selectedOptionId: { type: String },
    correctOptionIndex: { type: Number, required: true, min: 0 },
    correctOptionId: { type: String, required: true },
    isCorrect: { type: Boolean, required: true },
    explanation: { type: String },
  },
  { _id: false },
);

const QuizAttemptSchema: Schema<IQuizAttempt> = new Schema(
  {
    quizId: { type: Schema.Types.ObjectId, ref: 'Quiz', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    score: { type: Number, required: true, min: 0, max: 100 },
    answers: { type: Schema.Types.Mixed, required: true },
    passed: { type: Boolean, default: false },
    passingScorePercent: { type: Number, min: 1, max: 100 },
    xpRewarded: { type: Number, default: 0, min: 0 },
    isTimeout: { type: Boolean, default: false },
    // A session may create exactly one attempt.  This is the durable backstop
    // for retries/crashes between grading and marking the session submitted.
    sessionId: { type: Schema.Types.ObjectId, ref: 'QuizSession', unique: true, sparse: true, index: { name: 'session_attempt_once' } },
    startedAt: { type: Date },
    completedAt: { type: Date, index: true },
    durationSeconds: { type: Number, min: 0 },
    gradedAt: { type: Date },
    reviewQuestions: { type: [QuizReviewQuestionSchema], default: [] },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

QuizAttemptSchema.index({ userId: 1, completedAt: -1 }, { name: 'quiz_attempt_history_by_user' });

export const QuizAttempt: Model<IQuizAttempt> =
  mongoose.models.QuizAttempt || mongoose.model<IQuizAttempt>('QuizAttempt', QuizAttemptSchema);
export default QuizAttempt;
