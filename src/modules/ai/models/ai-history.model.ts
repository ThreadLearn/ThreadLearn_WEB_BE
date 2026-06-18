import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAIHistory extends Document {
  userId: mongoose.Types.ObjectId;
  courseId?: mongoose.Types.ObjectId;
  lessonId?: mongoose.Types.ObjectId;
  codeExecutionId?: mongoose.Types.ObjectId;
  inputCode?: string;
  language?: string;
  prompt: string;
  response: string;
  suggestions?: string[];
  raceConditions?: string[];
  optimizedCode?: string;
  explanation?: string;
  tokenUsage?: number;
  modelName?: string;
  feedbackRating?: number;
  status?: string;
  category: string;
  createdAt: Date;
}

const AIHistorySchema: Schema<IAIHistory> = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', index: true },
    lessonId: { type: Schema.Types.ObjectId, ref: 'Lesson', index: true },
    codeExecutionId: { type: Schema.Types.ObjectId, ref: 'CodeExecution' },
    inputCode: { type: String, maxlength: 50000 },
    language: { type: String, trim: true },
    prompt: { type: String, required: true },
    response: { type: String, required: true },
    suggestions: { type: [String], default: [] },
    raceConditions: { type: [String], default: [] },
    optimizedCode: { type: String },
    explanation: { type: String },
    tokenUsage: { type: Number },
    modelName: { type: String },
    feedbackRating: { type: Number, min: 1, max: 5 },
    status: { type: String, enum: ['completed', 'failed'], default: 'completed' },
    category: { type: String, required: true, index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const AIHistory: Model<IAIHistory> =
  mongoose.models.AIHistory || mongoose.model<IAIHistory>('AIHistory', AIHistorySchema);
export default AIHistory;
