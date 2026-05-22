import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAIHistory extends Document {
  userId: mongoose.Types.ObjectId;
  prompt: string;
  response: string;
  category: string;
  createdAt: Date;
}

const AIHistorySchema: Schema<IAIHistory> = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    prompt: { type: String, required: true },
    response: { type: String, required: true },
    category: { type: String, required: true, index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const AIHistory: Model<IAIHistory> =
  mongoose.models.AIHistory || mongoose.model<IAIHistory>('AIHistory', AIHistorySchema);
export default AIHistory;
