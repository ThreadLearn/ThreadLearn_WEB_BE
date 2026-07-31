import mongoose, { Document, Model, Schema } from 'mongoose';

export type QuestionDifficulty = 'easy' | 'medium' | 'hard';
export type QuestionBankStatus = 'draft' | 'published' | 'archived';

export interface IQuizQuestionBank extends Document {
  quizId: mongoose.Types.ObjectId;
  lessonId: mongoose.Types.ObjectId;
  version: number;
  questionCount: number;
  activeQuestionCount: number;
  status: QuestionBankStatus;
  lastImportId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface IQuizBankOption {
  optionId: string;
  text: string;
}

export interface IQuizBankQuestion extends Document {
  bankId: mongoose.Types.ObjectId;
  quizId: mongoose.Types.ObjectId;
  lessonId: mongoose.Types.ObjectId;
  questionText: string;
  options: IQuizBankOption[];
  correctOptionId: string;
  explanation?: string;
  difficulty: QuestionDifficulty;
  tags: string[];
  contentHash: string;
  status: 'active' | 'disabled';
  bankVersion: number;
  source: { importId?: mongoose.Types.ObjectId; row?: number; fileName?: string };
  createdAt: Date;
  updatedAt: Date;
}

const BankOptionSchema = new Schema<IQuizBankOption>(
  {
    optionId: { type: String, required: true },
    text: { type: String, required: true, trim: true },
  },
  { _id: false },
);

const QuizQuestionBankSchema = new Schema<IQuizQuestionBank>(
  {
    quizId: { type: Schema.Types.ObjectId, ref: 'Quiz', required: true, unique: true, index: true },
    lessonId: { type: Schema.Types.ObjectId, ref: 'Lesson', required: true, index: true },
    version: { type: Number, default: 0, min: 0 },
    questionCount: { type: Number, default: 5, min: 5, max: 10 },
    activeQuestionCount: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft' },
    lastImportId: { type: Schema.Types.ObjectId, ref: 'QuizBankImport' },
  },
  { timestamps: true, collection: 'quiz_question_banks' },
);

const QuizBankQuestionSchema = new Schema<IQuizBankQuestion>(
  {
    bankId: { type: Schema.Types.ObjectId, ref: 'QuizQuestionBank', required: true, index: true },
    quizId: { type: Schema.Types.ObjectId, ref: 'Quiz', required: true, index: true },
    lessonId: { type: Schema.Types.ObjectId, ref: 'Lesson', required: true, index: true },
    questionText: { type: String, required: true, trim: true },
    options: { type: [BankOptionSchema], required: true, validate: [(v: IQuizBankOption[]) => v.length >= 2 && v.length <= 6, 'Question must contain 2–6 options.'] },
    correctOptionId: { type: String, required: true },
    explanation: { type: String },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium', index: true },
    tags: { type: [String], default: [] },
    contentHash: { type: String, required: true },
    status: { type: String, enum: ['active', 'disabled'], default: 'active', index: true },
    bankVersion: { type: Number, required: true },
    source: {
      importId: { type: Schema.Types.ObjectId, ref: 'QuizBankImport' },
      row: { type: Number },
      fileName: { type: String },
    },
  },
  { timestamps: true, collection: 'quiz_bank_questions' },
);

QuizBankQuestionSchema.index({ quizId: 1, contentHash: 1 }, { unique: true });
QuizBankQuestionSchema.index({ quizId: 1, status: 1, difficulty: 1 });

export const QuizQuestionBank: Model<IQuizQuestionBank> =
  mongoose.models.QuizQuestionBank || mongoose.model<IQuizQuestionBank>('QuizQuestionBank', QuizQuestionBankSchema);
export const QuizBankQuestion: Model<IQuizBankQuestion> =
  mongoose.models.QuizBankQuestion || mongoose.model<IQuizBankQuestion>('QuizBankQuestion', QuizBankQuestionSchema);
