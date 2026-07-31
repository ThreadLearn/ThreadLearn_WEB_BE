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
  createdAt: Date;
}

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
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const QuizAttempt: Model<IQuizAttempt> =
  mongoose.models.QuizAttempt || mongoose.model<IQuizAttempt>('QuizAttempt', QuizAttemptSchema);
export default QuizAttempt;
