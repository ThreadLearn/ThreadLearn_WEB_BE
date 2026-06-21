import { Inject, Injectable } from '@nestjs/common';
import { DomainError, ErrorCode } from '../../../../shared/errors/error-codes';
import { CourseEntity } from '../../domain/entities/course.entity';
import { COURSE_CONTENT_PORT, ICourseContentPort } from '../../domain/interfaces/course-content.port';
import { COURSE_REPOSITORY, ICourseRepository } from '../../domain/interfaces/course.repository';

/** UC17 — Hide / Show Course (publish | hidden | draft). */
@Injectable()
export class SetCourseVisibilityService {
  constructor(
    @Inject(COURSE_REPOSITORY) private readonly repo: ICourseRepository,
    @Inject(COURSE_CONTENT_PORT) private readonly content: ICourseContentPort,
  ) {}

  async execute(id: string, status: 'published' | 'hidden' | 'draft'): Promise<CourseEntity> {
    const course = await this.repo.findById(id);
    if (!course || course.isDeleted) {
      throw DomainError.notFound(ErrorCode.COURSE_NOT_FOUND, 'Course not found.');
    }

    if (status === 'published') {
      const activeLessons = await this.content.countActiveLessons(course.id);
      course.publish(activeLessons); // BR enforced trong entity
    } else if (status === 'hidden') {
      course.hide();
    } else {
      course.toDraft();
    }
    return this.repo.update(course);
  }
}
