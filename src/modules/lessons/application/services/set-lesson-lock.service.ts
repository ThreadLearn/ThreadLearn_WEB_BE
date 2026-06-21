import { Inject, Injectable } from '@nestjs/common';
import { DomainError, ErrorCode } from '../../../../shared/errors/error-codes';
import { LessonEntity } from '../../domain/entities/lesson.entity';
import { ILessonRepository, LESSON_REPOSITORY } from '../../domain/interfaces/lesson.repository';

/** UC — admin khoá / mở khoá 1 bài học. */
@Injectable()
export class SetLessonLockService {
  constructor(@Inject(LESSON_REPOSITORY) private readonly repo: ILessonRepository) {}

  async execute(lessonId: string, locked: boolean): Promise<LessonEntity> {
    const lesson = await this.repo.findById(lessonId);
    if (!lesson || lesson.isDeleted) {
      throw DomainError.notFound(ErrorCode.LESSON_NOT_FOUND, 'Lesson not found.');
    }
    lesson.setLock(locked);
    return this.repo.update(lesson);
  }
}
