import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export type CodeShareTargetType = 'COURSE' | 'LESSON';
export type CodeShareVisibility = 'COURSE';

export interface ICodeShare extends Document {
  authorId: Types.ObjectId;
  targetType: CodeShareTargetType;
  targetId: Types.ObjectId;
  courseId?: Types.ObjectId;
  lessonId?: Types.ObjectId;
  exerciseId?: string;
  lessonVersionId?: Types.ObjectId;
  lessonUpdatedAt?: Date;
  sourceExecutionId: Types.ObjectId;
  language: string;
  sourceCode: string;
  status: string;
  stdout?: string;
  stderr?: string;
  compileOutput?: string;
  outputTruncated?: boolean;
  runtime?: string;
  memory?: number;
  visibility: CodeShareVisibility;
  createdAt: Date;
}

const CodeShareSchema = new Schema<ICodeShare>(
  {
    authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    targetType: { type: String, enum: ['COURSE', 'LESSON'], required: true },
    targetId: { type: Schema.Types.ObjectId, required: true, index: true },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', index: true },
    lessonId: { type: Schema.Types.ObjectId, ref: 'Lesson', index: true },
    exerciseId: { type: String, trim: true },
    lessonVersionId: { type: Schema.Types.ObjectId, ref: 'LessonVersion' },
    lessonUpdatedAt: { type: Date },
    sourceExecutionId: { type: Schema.Types.ObjectId, ref: 'CodeExecution', required: true, unique: true },
    language: { type: String, required: true, trim: true },
    sourceCode: { type: String, required: true, maxlength: 50000 },
    status: { type: String, required: true },
    stdout: { type: String, maxlength: 64000 },
    stderr: { type: String, maxlength: 64000 },
    compileOutput: { type: String, maxlength: 64000 },
    outputTruncated: { type: Boolean, default: false },
    runtime: { type: String },
    memory: { type: Number },
    visibility: { type: String, enum: ['COURSE'], default: 'COURSE' },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

CodeShareSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });
CodeShareSchema.index({ targetType: 1, targetId: 1, lessonId: 1, createdAt: -1 });
CodeShareSchema.index({ authorId: 1, createdAt: -1 });

export const CodeShare: Model<ICodeShare> =
  mongoose.models.CodeShare || mongoose.model<ICodeShare>('CodeShare', CodeShareSchema);

export default CodeShare;
