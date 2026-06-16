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
  timeLimitSeconds?: number;
  xpReward: number;
  timeLimit: number;
  passingScore: number;
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
