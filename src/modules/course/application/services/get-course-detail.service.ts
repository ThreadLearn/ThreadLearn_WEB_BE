import { Inject, Injectable } from '@nestjs/common';
import { DomainError, ErrorCode } from '../../../../shared/errors/error-codes';
import { CourseEntity } from '../../domain/entities/course.entity';
import { COURSE_CONTENT_PORT, ICourseContentPort } from '../../domain/interfaces/course-content.port';
import { COURSE_REPOSITORY, ICourseRepository } from '../../domain/interfaces/course.repository';

export interface CourseDetailViewer {
  id?: string;
  role?: string;
}

export interface CourseDetailResult {
  course: CourseEntity;
  sections: unknown[];
  lessons: unknown[];
}

/** UC23 — View Course Detail (course + sections + lessons). */
@Injectable()
export class GetCourseDetailService {
  constructor(
    @Inject(COURSE_REPOSITORY) private readonly repo: ICourseRepository,
    @Inject(COURSE_CONTENT_PORT) private readonly content: ICourseContentPort,
  ) {}

  async execute(idOrSlug: string, viewer?: CourseDetailViewer): Promise<CourseDetailResult> {
    const course = await this.repo.findByIdOrSlug(idOrSlug);
    if (!course || course.isDeleted) {
      throw DomainError.notFound(ErrorCode.COURSE_NOT_FOUND, 'Course not found.');
    }
    course.ensureViewableBy(viewer?.role);

    const { sections, lessons } = await this.content.getContent(course.id);
    return { course, sections, lessons };
  }
}
