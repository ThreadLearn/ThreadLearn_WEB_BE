import { Inject, Injectable } from '@nestjs/common';
import { DomainError, ErrorCode } from '../../../../shared/errors/error-codes';
import { CourseEntity } from '../../domain/entities/course.entity';
import { COURSE_REPOSITORY, ICourseRepository } from '../../domain/interfaces/course.repository';

/** UC18 — Delete Course (soft delete: archived nếu còn học viên, deleted nếu chưa ai học). */
@Injectable()
export class DeleteCourseService {
  constructor(@Inject(COURSE_REPOSITORY) private readonly repo: ICourseRepository) {}

  async execute(id: string): Promise<CourseEntity> {
    const course = await this.repo.findById(id);
    if (!course) {
      throw DomainError.notFound(ErrorCode.COURSE_NOT_FOUND, 'Course not found.');
    }
    if (course.isDeleted) return course;

    course.softDelete();
    return this.repo.update(course);
  }
}
