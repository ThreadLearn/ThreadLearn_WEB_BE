import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface ITestCase {
  input: string;
  expectedOutput: string;
  isHidden: boolean;
  points: number;
}

export interface IExercise extends Document {
  lessonId: Types.ObjectId;
  title: string;
  description: string;
  starterCode: string;
  language: string;
  testCases: ITestCase[];
  totalPoints: number;
  timeLimitMs: number;
  createdAt: Date;
  updatedAt: Date;
}

const TestCaseSchema = new Schema<ITestCase>(
  {
    input: { type: String, default: '' },
    expectedOutput: { type: String, required: true },
    isHidden: { type: Boolean, default: false },
    points: { type: Number, default: 1, min: 0 },
  },
  { _id: false }
);

const ExerciseSchema: Schema<IExercise> = new Schema(
  {
    lessonId: { type: Schema.Types.ObjectId, ref: 'Lesson', required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    starterCode: { type: String, default: '' },
    language: { type: String, required: true, trim: true, lowercase: true },
    testCases: { type: [TestCaseSchema], default: [] },
    totalPoints: { type: Number, default: 0, min: 0 },
    timeLimitMs: { type: Number, default: 5000, min: 100, max: 30000 },
  },
  { timestamps: true }
);

ExerciseSchema.pre('save', function (next) {
  if (this.testCases?.length) {
    this.totalPoints = this.testCases.reduce((sum, tc) => sum + (tc.points || 0), 0);
  }
  next();
});

export const Exercise: Model<IExercise> =
  mongoose.models.Exercise || mongoose.model<IExercise>('Exercise', ExerciseSchema);
export default Exercise;
