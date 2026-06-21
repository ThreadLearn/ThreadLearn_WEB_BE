import { Inject, Injectable } from '@nestjs/common';
import {
  ILearningAccess,
  LEARNING_ACCESS,
  LearningAccessResult,
  LearningAccessViewer,
} from '../../../../shared/domain/interfaces/learning-access.port';

/** UC — kiểm tra quyền xem 1 bài (không ném lỗi, trả {canView, reason}). */
@Injectable()
export class CheckLessonAccessService {
  constructor(@Inject(LEARNING_ACCESS) private readonly access: ILearningAccess) {}

  execute(lessonId: string, viewer?: LearningAccessViewer): Promise<LearningAccessResult> {
    return this.access.checkLessonAccess(lessonId, viewer);
  }
}
