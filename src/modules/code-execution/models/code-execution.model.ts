import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICodeExecution extends Document {
  userId: mongoose.Types.ObjectId;
  exerciseId: mongoose.Types.ObjectId;
  code: string;
  language: 'javascript' | 'python';
  status: 'PASS' | 'FAIL' | 'PARTIAL' | 'ERROR' | 'PENDING';
  actualOutput: string;
  expectedOutput: string;
  passedCases: number;
  totalCases: number;
  executionTime: number;
  memoryUsage: number;
  stderr: string;
  createdAt: Date;
}

const CodeExecutionSchema: Schema<ICodeExecution> = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    exerciseId: { type: Schema.Types.ObjectId, ref: 'Exercise', required: true, index: true },
    code: { type: String, required: true },
    language: { type: String, enum: ['javascript', 'python'], required: true },
    status: {
      type: String,
      enum: ['PASS', 'FAIL', 'PARTIAL', 'ERROR', 'PENDING'],
      default: 'PENDING',
    },
    actualOutput: { type: String, default: '' },
    expectedOutput: { type: String, default: '' },
    passedCases: { type: Number, default: 0 },
    totalCases: { type: Number, default: 0 },
    executionTime: { type: Number, default: 0 },
    memoryUsage: { type: Number, default: 0 },
    stderr: { type: String, default: '' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const CodeExecution: Model<ICodeExecution> =
  mongoose.models.CodeExecution ||
  mongoose.model<ICodeExecution>('CodeExecution', CodeExecutionSchema);
export default CodeExecution;
export { CodeExecutionSchema };

