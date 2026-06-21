import { Inject, Injectable } from '@nestjs/common';
import { DomainError, ErrorCode } from '../../../../shared/errors/error-codes';
import { CourseEntity } from '../../domain/entities/course.entity';
import { COURSE_REPOSITORY, ICourseRepository } from '../../domain/interfaces/course.repository';

/** Khôi phục khoá học đã xoá mềm (trong cửa sổ 30 ngày — rule nằm trong entity). */
@Injectable()
export class RestoreCourseService {
  constructor(@Inject(COURSE_REPOSITORY) private readonly repo: ICourseRepository) {}

  async execute(id: string): Promise<CourseEntity> {
    const course = await this.repo.findById(id);
    if (!course) {
      throw DomainError.notFound(ErrorCode.COURSE_NOT_FOUND, 'Course not found.');
    }
    course.restore(new Date());
    return this.repo.update(course);
  }
}
