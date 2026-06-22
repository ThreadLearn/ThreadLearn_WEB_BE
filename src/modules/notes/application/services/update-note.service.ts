import { Inject, Injectable } from '@nestjs/common';
import { NotFoundError } from '../../../../common/custom-error';
import { INoteRepository, NOTE_REPOSITORY } from '../../domain/interfaces/note.repository';

@Injectable()
export class UpdateNoteService {
  constructor(@Inject(NOTE_REPOSITORY) private readonly notes: INoteRepository) {}

  async execute(userId: string, noteId: string, input: { noteText?: string; content?: string; codeSnippet?: string }) {
    const note = await this.notes.findOwned(userId, noteId);
    if (!note) throw new NotFoundError('Note not found.');
    note.applyPatch(input);
    return this.notes.update(note);
  }
}
