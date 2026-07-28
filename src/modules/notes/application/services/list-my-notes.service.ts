import { Inject, Injectable } from '@nestjs/common';
import { INoteRepository, NOTE_REPOSITORY } from '../../domain/interfaces/note.repository';

@Injectable()
export class ListMyNotesService {
  constructor(@Inject(NOTE_REPOSITORY) private readonly notes: INoteRepository) {}

  async execute(userId: string, page = 1, limit = 12) {
    return this.notes.listByUser(userId, page, limit);
  }
}
