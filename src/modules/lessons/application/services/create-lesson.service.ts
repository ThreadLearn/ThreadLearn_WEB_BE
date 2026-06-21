import { Inject, Injectable } from '@nestjs/common';
import { DomainError, ErrorCode } from '../../../../shared/errors/error-codes';
import {
  COURSE_CONTENT_PORT,
  ICourseContentPort,
} from '../../../course/domain/interfaces/course-content.port';
import {
  COURSE_REPOSITORY,
  ICourseRepository,
} from '../../../course/domain/interfaces/course.repository';
import { LessonEntity } from '../../domain/entities/lesson.entity';
import { LessonVersionEntity } from '../../domain/entities/lesson-version.entity';
import {
  EXERCISE_SEEDER_PORT,
  IExerciseSeederPort,
} from '../../domain/interfaces/exercise-seeder.port';
import { ILessonRepository, LESSON_REPOSITORY } from '../../domain/interfaces/lesson.repository';
import {
  ILessonVersionRepository,
  LESSON_VERSION_REPOSITORY,
} from '../../domain/interfaces/lesson-version.repository';
import { CreateLessonDto } from '../dto/lesson.dto';

/** UC15 — admin tạo bài học mới (kèm version v1 + auto-seed exercise cho coding/mixed). */
@Injectable()
export class CreateLessonService {
  constructor(
    @Inject(LESSON_REPOSITORY) private readonly repo: ILessonRepository,
    @Inject(LESSON_VERSION_REPOSITORY) private readonly versions: ILessonVersionRepository,
    @Inject(COURSE_REPOSITORY) private readonly courses: ICourseRepository,
    @Inject(COURSE_CONTENT_PORT) private readonly content: ICourseContentPort,
    @Inject(EXERCISE_SEEDER_PORT) private readonly seeder: IExerciseSeederPort,
  ) {}

  async execute(input: CreateLessonDto & { createdBy?: string }): Promise<LessonEntity> {
    const course = await this.courses.findById(input.courseId);
    if (!course || course.isDeleted) {
      throw DomainError.notFound(ErrorCode.COURSE_NOT_FOUND, 'Course not found.');
    }

    const orderIndex =
      typeof input.orderIndex === 'number'
        ? input.orderIndex
        : await this.repo.countNonDeleted(input.courseId);

    let lesson = LessonEntity.createNew({ ...input, orderIndex });
    lesson = await this.repo.create(lesson);

    if ((input.contentMarkdown?.length ?? 0) > 0) {
      const version = await this.versions.create(
        LessonVersionEntity.createNew({
          lessonId: lesson.id,
          version: 1,
          contentMarkdown: input.contentMarkdown ?? '',
          createdBy: input.createdBy,
        }),
      );
      lesson.setCurrentVersion(version.id);
      lesson = await this.repo.update(lesson);
    }

    await this.content.refreshLessonCount(input.courseId);

    if (lesson.lessonType === 'coding' || lesson.lessonType === 'mixed') {
      // Best-effort: không để lỗi seed exercise làm hỏng việc tạo bài.
      await this.seeder
        .seedStarter({
          lessonId: lesson.id,
          lessonTitle: lesson.title,
          courseLanguage: course.toProps().language,
        })
        .catch(() => undefined);
    }

    return lesson;
  }
}
