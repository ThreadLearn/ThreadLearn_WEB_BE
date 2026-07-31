import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IQuizSessionOption {
  optionId: string;
  text: string;
}

export interface IQuizSessionQuestion {
  sourceQuestionId: mongoose.Types.ObjectId;
  questionText: string;
  options: IQuizSessionOption[];
  /** Server-only. Presenter bắt buộc loại field này khỏi response học viên. */
  correctAnswerIndex: number;
  explanation?: string;
}

export interface IQuizSession extends Document {
  quizId: mongoose.Types.ObjectId;
  lessonId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  status: 'in_progress' | 'submitting' | 'submitted' | 'expired' | 'abandoned';
  questions: IQuizSessionQuestion[];
  answers: Record<string, number>;
  startedAt: Date;
  expiresAt?: Date;
  submittedAt?: Date;
  quizAttemptId?: mongoose.Types.ObjectId;
  submittingAt?: Date;
  submissionKey?: string;
  createdAt: Date;
  updatedAt: Date;
}

const OptionSchema = new Schema<IQuizSessionOption>(
  { optionId: { type: String, required: true }, text: { type: String, required: true } },
  { _id: false },
);
const QuestionSchema = new Schema<IQuizSessionQuestion>(
  {
    sourceQuestionId: { type: Schema.Types.ObjectId, ref: 'QuizBankQuestion', required: true },
    questionText: { type: String, required: true },
    options: { type: [OptionSchema], required: true },
    correctAnswerIndex: { type: Number, required: true, select: false },
    explanation: { type: String, select: false },
  },
  { _id: false },
);

const QuizSessionSchema = new Schema<IQuizSession>(
  {
    quizId: { type: Schema.Types.ObjectId, ref: 'Quiz', required: true, index: true },
    lessonId: { type: Schema.Types.ObjectId, ref: 'Lesson', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: { type: String, enum: ['in_progress', 'submitting', 'submitted', 'expired', 'abandoned'], default: 'in_progress', index: true },
    questions: { type: [QuestionSchema], required: true },
    answers: { type: Schema.Types.Mixed, default: {} },
    startedAt: { type: Date, required: true },
    expiresAt: { type: Date },
    submittedAt: { type: Date },
    quizAttemptId: { type: Schema.Types.ObjectId, ref: 'QuizAttempt' },
    submittingAt: { type: Date },
    submissionKey: { type: String, maxlength: 200 },
  },
  { timestamps: true, collection: 'quiz_sessions' },
);

QuizSessionSchema.index({ userId: 1, quizId: 1, status: 1, startedAt: -1 });
QuizSessionSchema.index(
  { userId: 1, quizId: 1 },
  { unique: true, partialFilterExpression: { status: 'in_progress' }, name: 'one_active_session_per_user_quiz' },
);
QuizSessionSchema.index({ status: 1, submittingAt: 1 });

export const QuizSession: Model<IQuizSession> =
  mongoose.models.QuizSession || mongoose.model<IQuizSession>('QuizSession', QuizSessionSchema);
