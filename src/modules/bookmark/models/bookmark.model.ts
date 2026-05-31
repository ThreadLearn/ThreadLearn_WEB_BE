import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IBookmark extends Document {
  userId: mongoose.Types.ObjectId;
  targetType: 'COURSE' | 'LESSON';
  targetId: string;
  title: string;
  thumbnailUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const BookmarkSchema: Schema<IBookmark> = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    targetType: { type: String, enum: ['COURSE', 'LESSON'], required: true },
    targetId: { type: String, required: true },
    title: { type: String, required: true, trim: true },
    thumbnailUrl: { type: String },
  },
  { timestamps: true }
);

BookmarkSchema.index({ userId: 1, targetType: 1, targetId: 1 }, { unique: true });

export const Bookmark: Model<IBookmark> =
  mongoose.models.Bookmark || mongoose.model<IBookmark>('Bookmark', BookmarkSchema);
export default Bookmark;
export { BookmarkSchema };

