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

  async listByUser(userId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [notes, total] = await Promise.all([
      Note.find({ userId })
        .populate('lessonId', 'title courseId')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Note.countDocuments({ userId }),
    ]);

    return {
      data: notes.map((note) => NoteMapper.formatView(note)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async upsert(note: NoteEntity): Promise<unknown> {
    const props = note.toProps();
    const saved = await Note.findOneAndUpdate(
      { userId: props.userId, lessonId: props.lessonId },
      { $set: { noteText: props.noteText, codeSnippet: props.codeSnippet } },
      { new: true, upsert: true, setDefaultsOnInsert: true, sort: { updatedAt: -1 } },
    );
    return saved ? NoteMapper.formatView(saved) : null;
  }

  async findOwned(userId: string, noteId: string): Promise<NoteEntity | null> {
    if (!mongoose.isValidObjectId(noteId)) throw new BadRequestError('Invalid note id.');
    const doc = await Note.findOne({ _id: noteId, userId });
    return doc ? NoteMapper.toEntity(doc) : null;
  }

  async update(note: NoteEntity): Promise<unknown> {
    const doc = await Note.findByIdAndUpdate(note.id, NoteMapper.toPersistence(note), { new: true });
    if (!doc) throw new NotFoundError('Note not found.');
    return NoteMapper.formatView(doc);
  }

  async search(userId: string, query: string): Promise<unknown[]> {
    if (!query?.trim()) return [];
    const notes = await Note.find({ userId, $text: { $search: query.trim() } })
      .populate('lessonId', 'title courseId')
      .sort({ updatedAt: -1 })
      .limit(50)
      .lean();
    return notes.map((note) => NoteMapper.formatView(note));
  }

  async remove(userId: string, noteId: string): Promise<boolean> {
    if (!mongoose.isValidObjectId(noteId)) throw new BadRequestError('Invalid note id.');
    const deleted = await Note.findOneAndDelete({ _id: noteId, userId });
    return !!deleted;
  }
}
