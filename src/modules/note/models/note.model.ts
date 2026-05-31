import mongoose, { Schema, Document, Model } from 'mongoose';

export interface INote extends Document {
  userId: mongoose.Types.ObjectId;
  lessonId: mongoose.Types.ObjectId;
  anchorText: string;
  anchorStart: number;
  anchorEnd: number;
  noteContent: string;
  createdAt: Date;
  updatedAt: Date;
}

const NoteSchema: Schema<INote> = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    lessonId: { type: Schema.Types.ObjectId, ref: 'Lesson', required: true },
    anchorText: { type: String, required: true },
    anchorStart: { type: Number, required: true },
    anchorEnd: { type: Number, required: true },
    noteContent: { type: String, required: true },
  },
  { timestamps: true }
);

// No unique index — 1 user can have MULTIPLE notes in the same lesson
NoteSchema.index({ userId: 1, lessonId: 1 });

export const Note: Model<INote> =
  mongoose.models.Note || mongoose.model<INote>('Note', NoteSchema);
export default Note;
export { NoteSchema };

