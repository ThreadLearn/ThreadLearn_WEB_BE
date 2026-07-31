import mongoose, { Document, Model, Schema } from 'mongoose';

export interface ICodeExecution extends Document {
  userId: mongoose.Types.ObjectId;
  courseId?: mongoose.Types.ObjectId;
  lessonId?: mongoose.Types.ObjectId;
  exerciseId?: string;
  sourceCode: string;
  language: string;
  languageId: number;
  stdin?: string;
  status: string;
  stdout?: string;
  stderr?: string;
  compileOutput?: string;
  outputTruncated?: boolean;
  runtime?: string;
  memory?: number;
  judge0Token?: string;
  exitCode?: number;
  errorMessage?: string;
  executedAt: Date;
  createdAt: Date;
}

const CodeExecutionSchema: Schema<ICodeExecution> = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', index: true },
    lessonId: { type: Schema.Types.ObjectId, ref: 'Lesson', index: true },
    exerciseId: { type: String, trim: true },
    sourceCode: { type: String, required: true, maxlength: 50000 },
    language: { type: String, required: true, trim: true },
    languageId: { type: Number, required: true },
    stdin: { type: String, maxlength: 10000 },
    status: { type: String, required: true, index: true },
    stdout: { type: String },
    stderr: { type: String },
    compileOutput: { type: String },
    outputTruncated: { type: Boolean, default: false },
    runtime: { type: String },
    memory: { type: Number },
    judge0Token: { type: String },
    exitCode: { type: Number },
    errorMessage: { type: String },
    executedAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

CodeExecutionSchema.index({ userId: 1, createdAt: -1 });
CodeExecutionSchema.index({ userId: 1, lessonId: 1, createdAt: -1 });
CodeExecutionSchema.index({ userId: 1, lessonId: 1, exerciseId: 1, createdAt: -1 });

export const CodeExecution: Model<ICodeExecution> =
  mongoose.models.CodeExecution ||
  mongoose.model<ICodeExecution>('CodeExecution', CodeExecutionSchema);

export default CodeExecution;
