import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export type BookmarkTargetType = 'COURSE' | 'LESSON';

export interface IBookmark extends Document {
  userId:        Types.ObjectId;
  targetType:    BookmarkTargetType;
  targetId:      Types.ObjectId | string;
  title:         string;
  thumbnailUrl?: string;
  anchorText?:   string;
  position?:     number;
  note?:         string;
  folder?:       string;
  tags?:         string[];
  status?:       'active' | 'deleted';
  createdAt:     Date;
  updatedAt:     Date;
}

const BookmarkSchema: Schema<IBookmark> = new Schema(
  {
    userId:       { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    targetType:   { type: String, enum: ['COURSE', 'LESSON'], required: true },
    targetId:     { type: Schema.Types.ObjectId, required: true, index: true },
    title:        { type: String, required: true, trim: true },
    thumbnailUrl: { type: String },
    anchorText:   { type: String, trim: true },
    position:     { type: Number, min: 0 },
    note:         { type: String, trim: true, maxlength: 2000 },
    folder:       { type: String, trim: true },
    tags:         { type: [String], default: [] },
    status:       { type: String, enum: ['active', 'deleted'], default: 'active', index: true },
  },
  { timestamps: true },
);
BookmarkSchema.index({ userId: 1, targetType: 1, targetId: 1 }, { unique: true });
BookmarkSchema.index({ userId: 1, status: 1, createdAt: -1 });

export const Bookmark: Model<IBookmark> =
  mongoose.models.Bookmark || mongoose.model<IBookmark>('Bookmark', BookmarkSchema);
export { BookmarkSchema };
export default Bookmark;
