import { Inject, Injectable } from '@nestjs/common';
import { DomainError, ErrorCode } from '../../../../shared/errors/error-codes';
import { LessonEntity } from '../../domain/entities/lesson.entity';
import { ILessonRepository, LESSON_REPOSITORY } from '../../domain/interfaces/lesson.repository';

const isObjectId = (v: string) => /^[a-fA-F0-9]{24}$/.test(v);

/** UC — liệt kê bài học của 1 course (đã bỏ nội dung nặng). */
@Injectable()
export class ListLessonsByCourseService {
  constructor(@Inject(LESSON_REPOSITORY) private readonly repo: ILessonRepository) {}

  async execute(courseId: string): Promise<LessonEntity[]> {
    if (!courseId || !isObjectId(courseId)) {
      throw DomainError.badRequest(ErrorCode.LESSON_INVALID_INPUT, 'Invalid course id.');
    }
    return this.repo.listByCourse(courseId);
  }
}
