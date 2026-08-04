import { Inject, Injectable } from '@nestjs/common';
import { CourseEntity } from '../../domain/entities/course.entity';
import { COURSE_REPOSITORY, ICourseRepository } from '../../domain/interfaces/course.repository';
import { CreateCourseDto } from '../dto/course.dto';
import { generateUniqueSlug } from './slug.util';
import { CourseInstructorAssignmentPolicy } from './course-instructor-assignment.policy';

/** UC15 — Add New Course. */
@Injectable()
export class CreateCourseService {
  constructor(
    @Inject(COURSE_REPOSITORY) private readonly repo: ICourseRepository,
    private readonly assignmentPolicy: CourseInstructorAssignmentPolicy,
  ) {}

  async execute(input: CreateCourseDto & { createdBy?: string }): Promise<CourseEntity> {
    const slug = await generateUniqueSlug(input.title, (s) => this.repo.isSlugTaken(s));
    const instructorId = await this.assignmentPolicy.resolveInstructorId(input.instructorId);
    const course = CourseEntity.createNew({ ...input, instructorId, slug });
    return this.repo.create(course);
  }
}
