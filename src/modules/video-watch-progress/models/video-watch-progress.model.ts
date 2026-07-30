import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IVideoWatchProgress extends Document {
  userId: mongoose.Types.ObjectId;
  lessonId: mongoose.Types.ObjectId;
  currentTimeSeconds: number;
  durationSeconds?: number;
  createdAt: Date;
  updatedAt: Date;
}

const VideoWatchProgressSchema = new Schema<IVideoWatchProgress>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    lessonId: { type: Schema.Types.ObjectId, ref: 'Lesson', required: true, index: true },
    currentTimeSeconds: { type: Number, required: true, min: 0, default: 0 },
    durationSeconds: { type: Number, min: 0 },
  },
  { timestamps: true }
);

VideoWatchProgressSchema.index({ userId: 1, lessonId: 1 }, { unique: true });

export const VideoWatchProgress: Model<IVideoWatchProgress> =
  mongoose.models.VideoWatchProgress ||
  mongoose.model<IVideoWatchProgress>('VideoWatchProgress', VideoWatchProgressSchema);
