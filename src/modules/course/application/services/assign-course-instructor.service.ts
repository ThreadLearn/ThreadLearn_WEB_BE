import { Inject, Injectable } from '@nestjs/common';
import { DomainError, ErrorCode } from '../../../../shared/errors/error-codes';
import { COURSE_REPOSITORY, ICourseRepository } from '../../domain/interfaces/course.repository';
import { CourseInstructorAssignmentPolicy } from './course-instructor-assignment.policy';

@Injectable()
export class AssignCourseInstructorService {
  constructor(
    @Inject(COURSE_REPOSITORY) private readonly courseRepo: ICourseRepository,
    private readonly assignmentPolicy: CourseInstructorAssignmentPolicy,
  ) {}

  async execute(courseId: string, instructorId: string | null) {
    const course = await this.courseRepo.findById(courseId);
    if (!course || course.isDeleted) {
      throw DomainError.notFound(ErrorCode.COURSE_NOT_FOUND, 'Course not found.');
    }

    course.assignInstructor(await this.assignmentPolicy.resolveInstructorId(instructorId));
    return this.courseRepo.update(course);
  }
}
