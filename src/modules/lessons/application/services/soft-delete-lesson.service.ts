import { Inject, Injectable } from '@nestjs/common';
import { DomainError, ErrorCode } from '../../../../shared/errors/error-codes';
import {
  COURSE_CONTENT_PORT,
  ICourseContentPort,
} from '../../../course/domain/interfaces/course-content.port';
import { ILessonRepository, LESSON_REPOSITORY } from '../../domain/interfaces/lesson.repository';

/** UC — admin xoá mềm 1 bài học (refresh lại lesson-count của course). */
@Injectable()
export class SoftDeleteLessonService {
  constructor(
    @Inject(LESSON_REPOSITORY) private readonly repo: ILessonRepository,
    @Inject(COURSE_CONTENT_PORT) private readonly content: ICourseContentPort,
  ) {}

  async execute(lessonId: string): Promise<{ id: string }> {
    const lesson = await this.repo.findById(lessonId);
    if (!lesson || lesson.isDeleted) {
      throw DomainError.notFound(ErrorCode.LESSON_NOT_FOUND, 'Lesson not found.');
    }
    const courseId = lesson.courseId;
    lesson.softDelete();
    await this.repo.update(lesson);
    await this.content.refreshLessonCount(courseId);
    return { id: lesson.id };
  }
}
