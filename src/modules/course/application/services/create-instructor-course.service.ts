import { Inject, Injectable } from '@nestjs/common';
import { ForbiddenError } from '../../../../common/custom-error';
import { CourseEntity } from '../../domain/entities/course.entity';
import { COURSE_REPOSITORY, ICourseRepository } from '../../domain/interfaces/course.repository';
import { CreateInstructorCourseDto } from '../dto/course.dto';
import { generateUniqueSlug } from './slug.util';
import { CourseManagementActor } from '../policies/course-management.policy';

@Injectable()
export class CreateInstructorCourseService {
  constructor(@Inject(COURSE_REPOSITORY) private readonly repo: ICourseRepository) {}

  async execute(
    actor: CourseManagementActor,
    input: CreateInstructorCourseDto & { thumbnailUrl?: string },
  ): Promise<CourseEntity> {
    if (!actor?.id || actor.role !== 'INSTRUCTOR') {
      throw new ForbiddenError('Only instructors can create instructor courses.');
    }

    const slug = await generateUniqueSlug(input.title, (s) => this.repo.isSlugTaken(s));

    const course = CourseEntity.createNew({
      title: input.title,
      slug,
      description: input.description,
      shortDescription: input.shortDescription,
      thumbnailUrl: input.thumbnailUrl,
      language: input.language,
      level: input.level,
      tags: input.tags,
      category: input.category,
      prerequisites: input.prerequisites,
      prerequisiteThreshold: input.prerequisiteThreshold,
      estimatedDuration: input.estimatedDuration,
      status: 'draft',
      instructorId: actor.id,
      createdBy: actor.id,
    });

    return this.repo.create(course);
  }
}
