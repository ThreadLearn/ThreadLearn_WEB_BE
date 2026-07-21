import { Inject, Injectable } from '@nestjs/common';
import {
  ILearningAccess,
  LEARNING_ACCESS,
} from '../../../../shared/domain/interfaces/learning-access.port';
import { NoteEntity } from '../../domain/entities/note.entity';
import { INoteRepository, NOTE_REPOSITORY } from '../../domain/interfaces/note.repository';
import { CreateNoteDto } from '../dto/note.dto';

@Injectable()
export class CreateNoteService {
  constructor(
    @Inject(NOTE_REPOSITORY) private readonly notes: INoteRepository,
    @Inject(LEARNING_ACCESS) private readonly learningAccess: ILearningAccess
  ) {}

  async execute(userId: string, input: CreateNoteDto) {
    await this.learningAccess.assertLessonInteractionAccess(input.lessonId, {
      id: userId,
      role: 'STUDENT',
    });
    return this.notes.create(NoteEntity.createNew({ ...input, userId }));
  }
}
