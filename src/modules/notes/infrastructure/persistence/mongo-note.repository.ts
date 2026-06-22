import { Injectable } from '@nestjs/common';
import mongoose from 'mongoose';
import { BadRequestError, NotFoundError } from '../../../../common/custom-error';
import { NoteEntity } from '../../domain/entities/note.entity';
import { INoteRepository } from '../../domain/interfaces/note.repository';
import { Note } from '../../models/note.model';
import { NoteMapper } from '../mapper/note.mapper';

@Injectable()
export class MongoNoteRepository implements INoteRepository {
  async findLatestByLesson(userId: string, lessonId: string): Promise<unknown | null> {
    return Note.findOne({ userId, lessonId }).sort({ updatedAt: -1 });
  }

  async upsert(note: NoteEntity): Promise<unknown> {
    const props = note.toProps();
    return Note.findOneAndUpdate(
      { userId: props.userId, lessonId: props.lessonId },
      { $set: { noteText: props.noteText, codeSnippet: props.codeSnippet } },
      { new: true, upsert: true, setDefaultsOnInsert: true, sort: { updatedAt: -1 } },
    );
  }

  async findOwned(userId: string, noteId: string): Promise<NoteEntity | null> {
    if (!mongoose.isValidObjectId(noteId)) throw new BadRequestError('Invalid note id.');
    const doc = await Note.findOne({ _id: noteId, userId });
    return doc ? NoteMapper.toEntity(doc) : null;
  }

  async update(note: NoteEntity): Promise<unknown> {
    const doc = await Note.findByIdAndUpdate(note.id, NoteMapper.toPersistence(note), { new: true });
    if (!doc) throw new NotFoundError('Note not found.');
    return doc;
  }

  async search(userId: string, query: string): Promise<unknown[]> {
    if (!query?.trim()) return [];
    return Note.find({ userId, $text: { $search: query.trim() } }).sort({ updatedAt: -1 }).limit(50);
  }

  async remove(userId: string, noteId: string): Promise<boolean> {
    if (!mongoose.isValidObjectId(noteId)) throw new BadRequestError('Invalid note id.');
    const deleted = await Note.findOneAndDelete({ _id: noteId, userId });
    return !!deleted;
  }
}
