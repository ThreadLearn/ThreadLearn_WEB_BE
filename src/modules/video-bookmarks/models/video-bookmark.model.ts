import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IVideoBookmark extends Document {
  userId: mongoose.Types.ObjectId;
  lessonId: mongoose.Types.ObjectId;
  timestampSeconds: number;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

const VideoBookmarkSchema = new Schema<IVideoBookmark>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    lessonId: { type: Schema.Types.ObjectId, ref: 'Lesson', required: true, index: true },
    timestampSeconds: { type: Number, required: true, min: 0 },
    note: { type: String, trim: true, maxlength: 280 },
  },
  { timestamps: true }
);

VideoBookmarkSchema.index({ userId: 1, lessonId: 1, createdAt: -1 });

export const VideoBookmark: Model<IVideoBookmark> =
  mongoose.models.VideoBookmark ||
  mongoose.model<IVideoBookmark>('VideoBookmark', VideoBookmarkSchema);
