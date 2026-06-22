import { Inject, Injectable } from '@nestjs/common';
import { INoteRepository, NOTE_REPOSITORY } from '../../domain/interfaces/note.repository';

@Injectable()
export class SearchNotesService {
  constructor(@Inject(NOTE_REPOSITORY) private readonly notes: INoteRepository) {}

  async execute(userId: string, query: string) {
    return this.notes.search(userId, query);
  }
}
