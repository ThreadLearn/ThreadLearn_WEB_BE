import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IImportedQuestion {
  row: number;
  questionText?: string;
  options?: string[];
  correctAnswer?: string;
  explanation?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  /** Giá trị difficulty gốc để hiển thị lỗi import thay vì âm thầm đổi về medium. */
  difficultyInput?: string;
  tags?: string[];
  errors: string[];
}

export interface IQuizBankImport extends Document {
  quizId: mongoose.Types.ObjectId;
  lessonId: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  fileName: string;
  fileType: 'xlsx' | 'docx';
  status: 'needs_review' | 'committed' | 'failed';
  questionCount: number;
  validCount: number;
  invalidCount: number;
  duplicateCount: number;
  items: IImportedQuestion[];
  committedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ImportedQuestionSchema = new Schema<IImportedQuestion>(
  {
    row: { type: Number, required: true },
    questionText: String,
    options: [String],
    correctAnswer: String,
    explanation: String,
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'] },
    difficultyInput: String,
    tags: [String],
    errors: { type: [String], default: [] },
  },
  // `errors` is intentionally exposed in the admin preview response.
  { _id: false, suppressReservedKeysWarning: true },
);

const QuizBankImportSchema = new Schema<IQuizBankImport>(
  {
    quizId: { type: Schema.Types.ObjectId, ref: 'Quiz', required: true, index: true },
    lessonId: { type: Schema.Types.ObjectId, ref: 'Lesson', required: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    fileName: { type: String, required: true },
    fileType: { type: String, enum: ['xlsx', 'docx'], required: true },
    status: { type: String, enum: ['needs_review', 'committed', 'failed'], default: 'needs_review' },
    questionCount: { type: Number, required: true },
    validCount: { type: Number, required: true },
    invalidCount: { type: Number, required: true },
    duplicateCount: { type: Number, default: 0 },
    items: { type: [ImportedQuestionSchema], required: true },
    committedAt: Date,
  },
  { timestamps: true, collection: 'quiz_bank_imports' },
);

QuizBankImportSchema.index({ quizId: 1, createdAt: -1 });

export const QuizBankImport: Model<IQuizBankImport> =
  mongoose.models.QuizBankImport || mongoose.model<IQuizBankImport>('QuizBankImport', QuizBankImportSchema);
