import { Inject, Injectable } from '@nestjs/common';
import {
  ILearningAccess,
  LEARNING_ACCESS,
} from '../../../../shared/domain/interfaces/learning-access.port';
import { INoteRepository, NOTE_REPOSITORY } from '../../domain/interfaces/note.repository';

@Injectable()
export class ListByLessonService {
  constructor(
    @Inject(NOTE_REPOSITORY) private readonly notes: INoteRepository,
    @Inject(LEARNING_ACCESS) private readonly learningAccess: ILearningAccess
  ) {}

  async execute(userId: string, lessonId: string) {
    await this.learningAccess.assertLessonInteractionAccess(lessonId, {
      id: userId,
      role: 'STUDENT',
    });
    return this.notes.listByLesson(userId, lessonId);
  }
}
