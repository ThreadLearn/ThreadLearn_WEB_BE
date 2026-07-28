import { NoteEntity } from '../entities/note.entity';

export interface NoteListResult {
  data: unknown[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface INoteRepository {
  listByLesson(userId: string, lessonId: string): Promise<unknown[]>;
  listByUser(userId: string, page: number, limit: number): Promise<NoteListResult>;
  create(note: NoteEntity): Promise<unknown>;
  findOwned(userId: string, noteId: string): Promise<NoteEntity | null>;
  update(note: NoteEntity): Promise<unknown>;
  search(userId: string, query: string): Promise<unknown[]>;
  remove(userId: string, noteId: string): Promise<boolean>;
}

export const NOTE_REPOSITORY = Symbol('NOTE_REPOSITORY');
