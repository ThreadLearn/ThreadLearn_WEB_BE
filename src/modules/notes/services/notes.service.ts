import mongoose from 'mongoose';
import { BadRequestError, NotFoundError } from '../../../common/custom-error';
import { LessonsService } from '../../lessons/services/lessons.service';
import { Note } from '../models/note.model';

export class NotesService {
  private static async assertLessonAccess(userId: string, lessonId: string) {
    return LessonsService.assertLessonAccess(lessonId, { id: userId, role: 'STUDENT' });
  }

  static async listByLesson(userId: string, lessonId: string) {
    await this.assertLessonAccess(userId, lessonId);
    const latest = await Note.findOne({ userId, lessonId }).sort({ updatedAt: -1 });
    return latest ? [latest] : [];
  }

  static async upsert(userId: string, input: { lessonId: string; noteText: string; codeSnippet?: string }) {
    await this.assertLessonAccess(userId, input.lessonId);
    if (!input.noteText?.trim()) throw new BadRequestError('noteText is required.');

    const note = await Note.findOneAndUpdate(
      { userId, lessonId: input.lessonId },
      {
        $set: {
          noteText: input.noteText.trim(),
          codeSnippet: input.codeSnippet,
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true, sort: { updatedAt: -1 } }
    );
    return note;
  }

  static async update(userId: string, noteId: string, input: { noteText?: string; content?: string; codeSnippet?: string }) {
    if (!mongoose.isValidObjectId(noteId)) throw new BadRequestError('Invalid note id.');
    const note = await Note.findOne({ _id: noteId, userId });
    if (!note) throw new NotFoundError('Note not found.');
    const nextText = input.noteText ?? input.content;
    if (nextText !== undefined) {
      if (!nextText.trim()) throw new BadRequestError('noteText is required.');
      note.noteText = nextText.trim();
    }
    if (input.codeSnippet !== undefined) note.codeSnippet = input.codeSnippet;
    await note.save();
    return note;
  }

  static async search(userId: string, query: string) {
    if (!query?.trim()) return [];
    return Note.find({
      userId,
      $text: { $search: query.trim() },
    })
      .sort({ updatedAt: -1 })
      .limit(50);
  }

  static async remove(userId: string, noteId: string) {
    if (!mongoose.isValidObjectId(noteId)) throw new BadRequestError('Invalid note id.');
    const deleted = await Note.findOneAndDelete({ _id: noteId, userId });
    if (!deleted) throw new NotFoundError('Note not found.');
    return { deleted: true };
  }
}

export default NotesService;
