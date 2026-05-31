import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import mongoose from 'mongoose';
import { INote } from '../models/note.model';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../../common/custom-error';

interface CreateNoteDto {
  lessonId: string;
  anchorText: string;
  anchorStart: number;
  anchorEnd: number;
  noteContent: string;
}

@Injectable()
export class NoteService {
  constructor(
    @InjectModel('Note')       private noteModel:       Model<INote>,
    @InjectModel('Lesson')     private lessonModel:     Model<any>,
    @InjectModel('Enrollment') private enrollmentModel: Model<any>,
  ) {}

  // BR-24: lesson must exist and student must be enrolled
  private async checkLessonAccess(userId: string, lessonId: string) {
    if (!mongoose.isValidObjectId(lessonId)) throw new NotFoundError('Lesson not found.');
    const lesson = await this.lessonModel.findById(lessonId);
    if (!lesson) throw new NotFoundError('Lesson not found.');

    const enrolled = await this.enrollmentModel.findOne({ userId, courseId: lesson.courseId });
    if (!enrolled) {
      throw new ForbiddenError('You must be enrolled to take notes on this lesson.');
    }
  }

  // BR-25: always scoped by userId from JWT
  async getMyNotesInLesson(userId: string, lessonId: string) {
    if (!mongoose.isValidObjectId(lessonId)) {
      throw new BadRequestError('Invalid lessonId format.');
    }
    return this.noteModel.find({ userId, lessonId }).sort({ anchorStart: 1 }).lean();
  }

  async createNote(userId: string, dto: CreateNoteDto) {
    if (dto.anchorEnd <= dto.anchorStart) {
      throw new BadRequestError('anchorEnd must be greater than anchorStart.');
    }
    await this.checkLessonAccess(userId, dto.lessonId);

    return this.noteModel.create({
      userId,
      lessonId:    dto.lessonId,
      anchorText:  dto.anchorText,
      anchorStart: dto.anchorStart,
      anchorEnd:   dto.anchorEnd,
      noteContent: dto.noteContent,
    });
  }

  async updateNote(userId: string, noteId: string, noteContent: string) {
    if (!mongoose.isValidObjectId(noteId)) throw new NotFoundError('Note not found.');
    const note = await this.noteModel.findOne({ _id: noteId, userId });
    if (!note) throw new NotFoundError('Note not found or access denied.');
    note.noteContent = noteContent;
    await note.save();
    return note;
  }

  async deleteNote(userId: string, noteId: string) {
    if (!mongoose.isValidObjectId(noteId)) throw new NotFoundError('Note not found.');
    const deleted = await this.noteModel.findOneAndDelete({ _id: noteId, userId });
    if (!deleted) throw new NotFoundError('Note not found or access denied.');
  }
}
