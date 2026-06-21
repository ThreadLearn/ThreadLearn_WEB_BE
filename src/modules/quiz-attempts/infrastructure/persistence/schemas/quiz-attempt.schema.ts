import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IQuizAttempt extends Document {
  quizId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  score: number;
  answers: Record<string, number>;
  passed: boolean;
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
    startedAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const QuizAttempt: Model<IQuizAttempt> =
  mongoose.models.QuizAttempt || mongoose.model<IQuizAttempt>('QuizAttempt', QuizAttemptSchema);
export default QuizAttempt;
