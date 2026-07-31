import mongoose, { Document, Model, Schema } from 'mongoose';

export interface INote extends Document {
  userId: mongoose.Types.ObjectId;
  lessonId: mongoose.Types.ObjectId;
  noteText: string;
  codeSnippet?: string;
  anchorText?: string;
  anchorStart?: number;
  anchorEnd?: number;
  sourceType?: 'DISCUSSION_CODE_SHARE';
  sourceCodeShareId?: mongoose.Types.ObjectId;
  sourceAuthorId?: mongoose.Types.ObjectId;
  sourceAuthorName?: string;
  sourceLink?: string;
  createdAt: Date;
  updatedAt: Date;
}

const NoteSchema = new Schema<INote>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    lessonId: { type: Schema.Types.ObjectId, ref: 'Lesson', required: true, index: true },
    noteText: { type: String, required: true, trim: true, maxlength: 10000 },
    codeSnippet: { type: String, maxlength: 50000 },
    anchorText: { type: String },
    anchorStart: { type: Number, min: 0 },
    anchorEnd: { type: Number, min: 0 },
    sourceType: { type: String, enum: ['DISCUSSION_CODE_SHARE'] },
    sourceCodeShareId: { type: Schema.Types.ObjectId, ref: 'CodeShare', index: true },
    sourceAuthorId: { type: Schema.Types.ObjectId, ref: 'User' },
    sourceAuthorName: { type: String, maxlength: 200 },
    sourceLink: { type: String, maxlength: 500 },
  },
  { timestamps: true }
);

NoteSchema.index({ userId: 1, lessonId: 1, updatedAt: -1 });
NoteSchema.index({ userId: 1, noteText: 'text', codeSnippet: 'text' });

export const Note: Model<INote> = mongoose.models.Note || mongoose.model<INote>('Note', NoteSchema);
export default Note;
