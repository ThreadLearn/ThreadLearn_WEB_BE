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
  passingScorePercent: number;
  passingScore: number;
  timeLimitSeconds?: number;
  timeLimit: number;
  xpReward: number;
  questions: IQuestion[];
  isDeleted: boolean;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export const QuizSchema: Schema<IQuiz> = new Schema(
  {
    lessonId: { 
      type: Schema.Types.ObjectId, 
      ref: 'Lesson', 
      required: true, 
    },
    title: { type: String, required: true, trim: true },
    description: { type: String },
    passingScorePercent: { type: Number, default: 80 },
    timeLimitSeconds: { type: Number },
    xpReward: { type: Number, default: 100 },
    timeLimit: { type: Number, default: 1800, min: 0 },
    passingScore: { type: Number, default: 80, min: 0, max: 100 },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
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

QuizSchema.index(
  { lessonId: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: false },
  },
);

export const Quiz: Model<IQuiz> =
  mongoose.models.Quiz || mongoose.model<IQuiz>('Quiz', QuizSchema);
export default Quiz;
