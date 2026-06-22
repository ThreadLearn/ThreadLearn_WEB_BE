import { Inject, Injectable } from '@nestjs/common';
import { NotFoundError } from '../../../../common/custom-error';
import { INoteRepository, NOTE_REPOSITORY } from '../../domain/interfaces/note.repository';

@Injectable()
export class RemoveNoteService {
  constructor(@Inject(NOTE_REPOSITORY) private readonly notes: INoteRepository) {}

  async execute(userId: string, noteId: string) {
    const deleted = await this.notes.remove(userId, noteId);
    if (!deleted) throw new NotFoundError('Note not found.');
    return { deleted: true };
  }
}
