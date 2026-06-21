import { Inject, Injectable } from '@nestjs/common';
import { DomainError, ErrorCode } from '../../../../shared/errors/error-codes';
import { LessonEntity } from '../../domain/entities/lesson.entity';
import { ILessonRepository, LESSON_REPOSITORY } from '../../domain/interfaces/lesson.repository';

/** UC — admin upload attachment cho bài học (append vào danh sách). */
@Injectable()
export class UpdateLessonAttachmentService {
  constructor(@Inject(LESSON_REPOSITORY) private readonly repo: ILessonRepository) {}

  async execute(lessonId: string, attachmentUrl: string): Promise<LessonEntity> {
    const lesson = await this.repo.findById(lessonId);
    if (!lesson || lesson.isDeleted) {
      throw DomainError.notFound(ErrorCode.LESSON_NOT_FOUND, 'Lesson not found.');
    }
    lesson.addAttachment(attachmentUrl);
    return this.repo.update(lesson);
  }
}
