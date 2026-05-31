import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAIAnalysis extends Document {
  userId: mongoose.Types.ObjectId;
  codeExecutionId?: mongoose.Types.ObjectId;
  inputCode: string;
  language: string;
  suggestions: string[];
  raceConditions: string[];
  optimizedCode?: string;
  tokensUsed: number;
  createdAt: Date;
}

const AIAnalysisSchema: Schema<IAIAnalysis> = new Schema(
  {
    userId:          { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    codeExecutionId: { type: Schema.Types.ObjectId, ref: 'CodeExecution' },
    inputCode:       { type: String, required: true },
    language:        { type: String, required: true },
    suggestions:     [{ type: String }],
    raceConditions:  [{ type: String }],
    optimizedCode:   { type: String },
    tokensUsed:      { type: Number, default: 0 },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const AIAnalysis: Model<IAIAnalysis> =
  mongoose.models.AIAnalysis || mongoose.model<IAIAnalysis>('AIAnalysis', AIAnalysisSchema);
export default AIAnalysis;
export { AIAnalysisSchema };

