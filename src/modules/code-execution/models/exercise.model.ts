import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ITestCase {
  input: string;
  expectedOutput: string;
  isHidden: boolean;
  points: number;
}

export interface IExercise extends Document {
  lessonId: mongoose.Types.ObjectId;
  title: string;
  description: string;
  starterCode: string;
  language: 'javascript' | 'python';
  testCases: ITestCase[];
  totalPoints: number;
  timeLimit: number;
  createdAt: Date;
  updatedAt: Date;
}

const TestCaseSchema = new Schema<ITestCase>(
  {
    input: { type: String, required: true },
    expectedOutput: { type: String, required: true },
    isHidden: { type: Boolean, default: false },
    points: { type: Number, default: 1 },
  },
  { _id: false }
);

const ExerciseSchema: Schema<IExercise> = new Schema(
  {
    lessonId: { type: Schema.Types.ObjectId, ref: 'Lesson', required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    starterCode: { type: String, default: '' },
    language: { type: String, enum: ['javascript', 'python'], required: true },
    testCases: [TestCaseSchema],
    totalPoints: { type: Number, default: 100 },
    timeLimit: { type: Number, default: 5 },
  },
  { timestamps: true }
);

export const Exercise: Model<IExercise> =
  mongoose.models.Exercise || mongoose.model<IExercise>('Exercise', ExerciseSchema);
export default Exercise;
