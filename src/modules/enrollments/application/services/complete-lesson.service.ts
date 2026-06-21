import { Inject, Injectable } from '@nestjs/common';
import {
  ILearningAccess,
  LEARNING_ACCESS,
} from '../../../../shared/domain/interfaces/learning-access.port';
import { EnrollmentsService } from '../../services/enrollments.service';

@Injectable()
export class CompleteLessonService {
  constructor(@Inject(LEARNING_ACCESS) private readonly access: ILearningAccess) {}

  async execute(userId: string, lessonId: string) {
    await this.access.assertLessonInteractionAccess(lessonId, { id: userId, role: 'STUDENT' });
    return EnrollmentsService.markLessonComplete(userId, lessonId);
  }
}
