import { NoteEntity } from '../entities/note.entity';

export interface INoteRepository {
  findLatestByLesson(userId: string, lessonId: string): Promise<unknown | null>;
  upsert(note: NoteEntity): Promise<unknown>;
  findOwned(userId: string, noteId: string): Promise<NoteEntity | null>;
  update(note: NoteEntity): Promise<unknown>;
  search(userId: string, query: string): Promise<unknown[]>;
  remove(userId: string, noteId: string): Promise<boolean>;
}

export const NOTE_REPOSITORY = Symbol('NOTE_REPOSITORY');
