import mongoose, { Model, Schema } from 'mongoose';

export interface IAIAnalysisCache {
  key: string;
  result: Record<string, unknown>;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AIAnalysisCacheSchema = new Schema<IAIAnalysisCache>(
  {
    key: { type: String, required: true, unique: true, index: true },
    result: { type: Schema.Types.Mixed, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

AIAnalysisCacheSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const AIAnalysisCache: Model<IAIAnalysisCache> =
  mongoose.models.AIAnalysisCache || mongoose.model<IAIAnalysisCache>('AIAnalysisCache', AIAnalysisCacheSchema);
