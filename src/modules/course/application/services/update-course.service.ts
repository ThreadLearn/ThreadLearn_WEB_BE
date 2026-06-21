import { Inject, Injectable } from '@nestjs/common';
import { DomainError, ErrorCode } from '../../../../shared/errors/error-codes';
import { CourseEntity } from '../../domain/entities/course.entity';
import { COURSE_REPOSITORY, ICourseRepository } from '../../domain/interfaces/course.repository';
import { UpdateCourseDto } from '../dto/course.dto';
import { generateUniqueSlug } from './slug.util';

/** UC16 — Edit Course Information (+ dùng lại cho upload thumbnail). */
@Injectable()
export class UpdateCourseService {
  constructor(@Inject(COURSE_REPOSITORY) private readonly repo: ICourseRepository) {}

  async execute(id: string, patch: UpdateCourseDto): Promise<CourseEntity> {
    const course = await this.repo.findById(id);
    if (!course || course.isDeleted) {
      throw DomainError.notFound(ErrorCode.COURSE_NOT_FOUND, 'Course not found.');
    }

    if (patch.title) {
      const needsNewSlug = course.rename(patch.title);
      if (needsNewSlug) {
        course.setSlug(await generateUniqueSlug(patch.title, (s) => this.repo.isSlugTaken(s, course.id)));
      }
    }
    course.applyEdits(patch);
    return this.repo.update(course);
  }
}
