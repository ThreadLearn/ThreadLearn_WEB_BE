import { Inject, Injectable } from '@nestjs/common';
import { DomainError, ErrorCode } from '../../../../shared/errors/error-codes';
import { LessonVersionEntity } from '../../domain/entities/lesson-version.entity';
import {
  ILessonVersionRepository,
  LESSON_VERSION_REPOSITORY,
} from '../../domain/interfaces/lesson-version.repository';

const isObjectId = (v: string) => /^[a-fA-F0-9]{24}$/.test(v);

/** UC — admin xem lịch sử version của 1 bài học. */
@Injectable()
export class ListLessonVersionsService {
  constructor(
    @Inject(LESSON_VERSION_REPOSITORY) private readonly versions: ILessonVersionRepository,
  ) {}

  async execute(lessonId: string): Promise<LessonVersionEntity[]> {
    if (!isObjectId(lessonId)) {
      throw DomainError.badRequest(ErrorCode.LESSON_INVALID_INPUT, 'Invalid lesson id.');
    }
    return this.versions.listByLesson(lessonId);
  }
}
