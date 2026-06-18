import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IQuestion {
  _id?: mongoose.Types.ObjectId;
  questionText: string;
  options: string[];
  correctAnswerIndex: number;
}

export interface IQuiz extends Document {
  lessonId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  // ── Điểm đạt (%) ──────────────────────────────────────────────
  // `passingScorePercent` là field CHUẨN (DTO + seed ghi field này).
  // `passingScore` là field tương thích cho luồng take-quiz; service
  // đọc cả hai theo thứ tự: passingScorePercent ?? passingScore ?? 80.
  // CHƯA gộp được vì bugfix-regression.spec.ts đang phụ thuộc `passingScore`.
  passingScorePercent: number;
  passingScore: number;
  // ── Giới hạn thời gian (giây) ─────────────────────────────────
  // `timeLimitSeconds` là field CHUẨN; `timeLimit` là field tương thích.
  // service đọc: timeLimit ?? timeLimitSeconds ?? 1800.
  timeLimitSeconds?: number;
  timeLimit: number;
  xpReward: number;
  questions: IQuestion[];
  createdAt: Date;
  updatedAt: Date;
}

const QuizSchema: Schema<IQuiz> = new Schema(
  {
    lessonId: { 
      type: Schema.Types.ObjectId, 
      ref: 'Lesson', 
      required: true, 
      index: true,
      unique: true,
    },
    title: { type: String, required: true, trim: true },
    description: { type: String },
    passingScorePercent: { type: Number, default: 80 },
    timeLimitSeconds: { type: Number },
    xpReward: { type: Number, default: 100 },
    timeLimit: { type: Number, default: 1800, min: 0 },
    passingScore: { type: Number, default: 80, min: 0, max: 100 },
    questions: [
      {
        questionText: { type: String, required: true },
        options: [{ type: String, required: true }],
        correctAnswerIndex: { type: Number, required: true },
      },
    ],
  },
  { timestamps: true }
);

export const Quiz: Model<IQuiz> =
  mongoose.models.Quiz || mongoose.model<IQuiz>('Quiz', QuizSchema);
export default Quiz;
