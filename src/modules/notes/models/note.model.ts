import mongoose, { Document, Model, Schema } from 'mongoose';

export interface INote extends Document {
  userId: mongoose.Types.ObjectId;
  lessonId: mongoose.Types.ObjectId;
  noteText: string;
  codeSnippet?: string;
  anchorText?: string;
  anchorStart?: number;
  anchorEnd?: number;
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
  },
  { timestamps: true }
);

NoteSchema.index({ userId: 1, lessonId: 1 }, { unique: true });
NoteSchema.index({ userId: 1, noteText: 'text', codeSnippet: 'text' });

export const Note: Model<INote> =
  mongoose.models.Note || mongoose.model<INote>('Note', NoteSchema);
export default Note;
