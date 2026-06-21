import { Inject, Injectable } from '@nestjs/common';
import { DomainError, ErrorCode } from '../../../../shared/errors/error-codes';
import {
  ILearningAccess,
  LEARNING_ACCESS,
  LearningAccessViewer,
} from '../../../../shared/domain/interfaces/learning-access.port';
import { LessonEntity } from '../../domain/entities/lesson.entity';
import { ILessonRepository, LESSON_REPOSITORY } from '../../domain/interfaces/lesson.repository';

const isObjectId = (v: string) => /^[a-fA-F0-9]{24}$/.test(v);

/**
 * UC25 — xem nội dung 1 bài học (có kiểm soát truy cập).
 * Best-effort cập nhật cursor resume qua learning-access (UC59).
 */
@Injectable()
export class GetLessonForViewerService {
  constructor(
    @Inject(LESSON_REPOSITORY) private readonly repo: ILessonRepository,
    @Inject(LEARNING_ACCESS) private readonly access: ILearningAccess,
  ) {}

  async execute(lessonId: string, viewer?: LearningAccessViewer): Promise<LessonEntity> {
    if (!isObjectId(lessonId)) {
      throw DomainError.badRequest(ErrorCode.LESSON_INVALID_INPUT, 'Invalid lesson id.');
    }
    const lesson = await this.repo.findById(lessonId);
    if (!lesson || lesson.isDeleted) {
      throw DomainError.notFound(ErrorCode.LESSON_NOT_FOUND, 'Lesson not found.');
    }

    const result = await this.access.checkLessonAccess(lessonId, viewer);
    if (!result.canView) {
      if (result.reason === 'LESSON_NOT_FOUND') {
        throw DomainError.notFound(ErrorCode.LESSON_NOT_FOUND, 'Lesson not found.');
      }
      if (result.reason === 'LESSON_LOCKED') {
        throw DomainError.forbidden(ErrorCode.LESSON_LOCKED, 'Lesson is locked.');
      }
      throw DomainError.forbidden(ErrorCode.NOT_ENROLLED, 'You must enroll before viewing this lesson.');
    }

    if (viewer?.id && result.reason === 'ENROLLED') {
      // Best-effort; never block the read path.
      await this.access
        .touchLessonCursor(viewer.id, lesson.courseId, lesson.id)
        .catch(() => undefined);
    }

    return lesson;
  }
}
