import { Inject, Injectable } from '@nestjs/common';
import { CourseEntity } from '../../domain/entities/course.entity';
import { COURSE_REPOSITORY, ICourseRepository } from '../../domain/interfaces/course.repository';
import { CreateCourseDto } from '../dto/course.dto';
import { generateUniqueSlug } from './slug.util';

/** UC15 — Add New Course. */
@Injectable()
export class CreateCourseService {
  constructor(@Inject(COURSE_REPOSITORY) private readonly repo: ICourseRepository) {}

  async execute(input: CreateCourseDto & { createdBy?: string }): Promise<CourseEntity> {
    const slug = await generateUniqueSlug(input.title, (s) => this.repo.isSlugTaken(s));
    const course = CourseEntity.createNew({ ...input, slug });
    return this.repo.create(course);
  }
}
