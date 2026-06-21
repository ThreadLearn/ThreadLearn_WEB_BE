import { Inject, Injectable } from '@nestjs/common';
import { DomainError, ErrorCode } from '../../../../shared/errors/error-codes';
import { LessonEntity } from '../../domain/entities/lesson.entity';
import { LessonVersionEntity } from '../../domain/entities/lesson-version.entity';
import { ILessonRepository, LESSON_REPOSITORY } from '../../domain/interfaces/lesson.repository';
import {
  ILessonVersionRepository,
  LESSON_VERSION_REPOSITORY,
} from '../../domain/interfaces/lesson-version.repository';
import { UpdateLessonDto } from '../dto/lesson.dto';

/** UC16 — admin cập nhật bài học; bump version khi nội dung đổi đủ lớn. */
@Injectable()
export class UpdateLessonService {
  constructor(
    @Inject(LESSON_REPOSITORY) private readonly repo: ILessonRepository,
    @Inject(LESSON_VERSION_REPOSITORY) private readonly versions: ILessonVersionRepository,
  ) {}

  async execute(
    lessonId: string,
    input: UpdateLessonDto,
    actor?: { id?: string },
  ): Promise<LessonEntity> {
    const lesson = await this.repo.findById(lessonId);
    if (!lesson || lesson.isDeleted) {
      throw DomainError.notFound(ErrorCode.LESSON_NOT_FOUND, 'Lesson not found.');
    }

    lesson.applyEdits({
      title: input.title,
      description: input.description,
      lessonType: input.lessonType,
      videoUrl: input.videoUrl,
      attachments: input.attachments,
      codeSnippets: input.codeSnippets,
      estimatedTime: input.estimatedTime,
      sectionId: input.sectionId,
      orderIndex: input.orderIndex,
      isPreview: input.isPreview,
    });

    let bumpVersion = false;
    if (typeof input.contentMarkdown === 'string') {
      bumpVersion = lesson.changeContent(input.contentMarkdown);
    }

    let saved = await this.repo.update(lesson);

    if (bumpVersion) {
      const latest = await this.versions.latestVersionNumber(saved.id);
      const version = await this.versions.create(
        LessonVersionEntity.createNew({
          lessonId: saved.id,
          version: latest + 1,
          contentMarkdown: saved.contentMarkdown,
          createdBy: actor?.id,
        }),
      );
      saved.setCurrentVersion(version.id);
      saved = await this.repo.update(saved);
    }

    return saved;
  }
}
