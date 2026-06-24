import { Inject, Injectable } from '@nestjs/common';
import {
  ILearningAccess,
  LEARNING_ACCESS,
} from '../../../../shared/domain/interfaces/learning-access.port';
import { NoteEntity } from '../../domain/entities/note.entity';
import { INoteRepository, NOTE_REPOSITORY } from '../../domain/interfaces/note.repository';

@Injectable()
export class UpsertNoteService {
  constructor(
    @Inject(NOTE_REPOSITORY) private readonly notes: INoteRepository,
    @Inject(LEARNING_ACCESS) private readonly learningAccess: ILearningAccess,
  ) {}

  async execute(userId: string, input: { lessonId: string; noteText: string; codeSnippet?: string }) {
    await this.learningAccess.assertLessonInteractionAccess(input.lessonId, { id: userId, role: 'STUDENT' });
    return this.notes.upsert(NoteEntity.createNew({ ...input, userId }));
  }
}
