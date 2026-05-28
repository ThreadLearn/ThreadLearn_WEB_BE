import mongoose from 'mongoose';
import { Note } from '../models/note.model';
import { Lesson } from '../../lessons/models/lesson.model';
import { Enrollment } from '../../enrollments/models/enrollment.model';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../../common/custom-error';

interface CreateNoteDto {
  lessonId: string;
  anchorText: string;
  anchorStart: number;
  anchorEnd: number;
  noteContent: string;
}

export class NoteService {
  // BR-24: lesson must exist and student must be enrolled in its course
  private static async checkLessonAccess(userId: string, lessonId: string) {
    if (!mongoose.isValidObjectId(lessonId)) {
      throw new NotFoundError('Lesson not found.');
    }
    const lesson = await Lesson.findById(lessonId);
    if (!lesson) throw new NotFoundError('Lesson not found.');

    const enrolled = await Enrollment.findOne({ userId, courseId: lesson.courseId });
    if (!enrolled) {
      throw new ForbiddenError('You must be enrolled in this course to take notes on its lessons.');
    }
  }

  // BR-25: always scoped by userId from JWT — never exposes another user's notes
  static async getMyNotesInLesson(userId: string, lessonId: string) {
    if (!mongoose.isValidObjectId(lessonId)) {
      throw new BadRequestError('Invalid lessonId format.');
    }
    return Note.find({ userId, lessonId }).sort({ anchorStart: 1 }).lean();
  }

  static async createNote(userId: string, dto: CreateNoteDto) {
    if (dto.anchorEnd <= dto.anchorStart) {
      throw new BadRequestError('anchorEnd must be greater than anchorStart.');
    }

    // BR-24
    await NoteService.checkLessonAccess(userId, dto.lessonId);

    return Note.create({
      userId,
      lessonId: dto.lessonId,
      anchorText: dto.anchorText,
      anchorStart: dto.anchorStart,
      anchorEnd: dto.anchorEnd,
      noteContent: dto.noteContent,
    });
  }

  static async updateNote(userId: string, noteId: string, noteContent: string) {
    if (!mongoose.isValidObjectId(noteId)) {
      throw new NotFoundError('Note not found.');
    }

    // BR-25: findOne scoped to userId — cannot touch another user's note
    const note = await Note.findOne({ _id: noteId, userId });
    if (!note) throw new NotFoundError('Note not found or access denied.');

    note.noteContent = noteContent;
    await note.save();
    return note;
  }

  static async deleteNote(userId: string, noteId: string) {
    if (!mongoose.isValidObjectId(noteId)) {
      throw new NotFoundError('Note not found.');
    }

    // BR-25: hard delete scoped to userId — cannot delete another user's note
    const deleted = await Note.findOneAndDelete({ _id: noteId, userId });
    if (!deleted) throw new NotFoundError('Note not found or access denied.');
  }
}

export default NoteService;
