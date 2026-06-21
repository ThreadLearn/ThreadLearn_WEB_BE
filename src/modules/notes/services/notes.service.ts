import { Inject, Injectable } from '@nestjs/common';
import mongoose from 'mongoose';
import { BadRequestError, NotFoundError } from '../../../common/custom-error';
import { ILearningAccess, LEARNING_ACCESS } from '../../../shared/domain/interfaces/learning-access.port';
import { Note } from '../models/note.model';

type NotesAccess = Pick<ILearningAccess, 'assertLessonInteractionAccess'>;

@Injectable()
export class NotesService {
  constructor(@Inject(LEARNING_ACCESS) private readonly learningAccess: ILearningAccess) {}

  async listByLesson(userId: string, lessonId: string) {
    return NotesService.listByLesson(userId, lessonId, this.learningAccess);
  }

  async upsert(userId: string, input: { lessonId: string; noteText: string; codeSnippet?: string }) {
    return NotesService.upsert(userId, input, this.learningAccess);
  }

  async update(userId: string, noteId: string, input: { noteText?: string; content?: string; codeSnippet?: string }) {
    return NotesService.update(userId, noteId, input);
  }

  async search(userId: string, query: string) {
    return NotesService.search(userId, query);
  }

  async remove(userId: string, noteId: string) {
    return NotesService.remove(userId, noteId);
  }

  private static async assertLessonAccess(userId: string, lessonId: string, accessPort: NotesAccess) {
    return accessPort.assertLessonInteractionAccess(lessonId, { id: userId, role: 'STUDENT' });
  }

  static async listByLesson(userId: string, lessonId: string, accessPort: NotesAccess) {
    await this.assertLessonAccess(userId, lessonId, accessPort);
    const latest = await Note.findOne({ userId, lessonId }).sort({ updatedAt: -1 });
    return latest ? [latest] : [];
  }

  static async upsert(
    userId: string,
    input: { lessonId: string; noteText: string; codeSnippet?: string },
    accessPort: NotesAccess,
  ) {
    await this.assertLessonAccess(userId, input.lessonId, accessPort);
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
