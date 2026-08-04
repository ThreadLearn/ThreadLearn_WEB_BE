import { Inject, Injectable } from '@nestjs/common';
import { DomainError, ErrorCode } from '../../../../shared/errors/error-codes';
import { CourseEntity } from '../../domain/entities/course.entity';
import { COURSE_CONTENT_PORT, ICourseContentPort } from '../../domain/interfaces/course-content.port';
import { COURSE_REPOSITORY, ICourseRepository } from '../../domain/interfaces/course.repository';
import { CourseManagementActor, CourseManagementPolicy } from '../policies/course-management.policy';

export interface InstructorCourseDetailResult {
  course: CourseEntity;
  sections: unknown[];
  lessons: unknown[];
}

@Injectable()
export class GetInstructorCourseDetailService {
  constructor(
    @Inject(COURSE_REPOSITORY) private readonly repo: ICourseRepository,
    @Inject(COURSE_CONTENT_PORT) private readonly content: ICourseContentPort,
    private readonly policy: CourseManagementPolicy,
  ) {}

  async execute(actor: CourseManagementActor, courseId: string): Promise<InstructorCourseDetailResult> {
    const course = await this.repo.findById(courseId);
    if (!course || course.isDeleted) {
      throw DomainError.notFound(ErrorCode.COURSE_NOT_FOUND, 'Course not found.');
    }

    this.policy.assertCanReadCourseForManagement(actor, course);

    const { sections, lessons } = await this.content.getContent(course.id);
    return { course, sections, lessons };
  }
}
