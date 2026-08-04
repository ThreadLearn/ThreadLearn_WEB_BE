import { Inject, Injectable } from '@nestjs/common';
import { DomainError, ErrorCode } from '../../../../shared/errors/error-codes';
import { CourseEntity } from '../../domain/entities/course.entity';
import { COURSE_REPOSITORY, ICourseRepository } from '../../domain/interfaces/course.repository';
import { UpdateInstructorCourseDto } from '../dto/course.dto';
import { CourseManagementActor, CourseManagementPolicy } from '../policies/course-management.policy';
import { generateUniqueSlug } from './slug.util';

@Injectable()
export class UpdateInstructorCourseService {
  constructor(
    @Inject(COURSE_REPOSITORY) private readonly courseRepo: ICourseRepository,
    private readonly policy: CourseManagementPolicy,
  ) {}

  async execute(
    actor: CourseManagementActor,
    courseId: string,
    input: UpdateInstructorCourseDto & { isPremium?: boolean; price?: number; instructorId?: string; createdBy?: string; status?: string; thumbnailUrl?: string },
  ): Promise<CourseEntity> {
    const course = await this.courseRepo.findById(courseId);
    if (!course || course.isDeleted) {
      throw DomainError.notFound(ErrorCode.COURSE_NOT_FOUND, 'Course not found.');
    }

    this.policy.assertCanAuthorCourse(actor, course);

    if (input.title !== undefined) {
      const needsNewSlug = course.rename(input.title);
      if (needsNewSlug) {
        const slug = await generateUniqueSlug(input.title, (s) => this.courseRepo.isSlugTaken(s, courseId));
        course.setSlug(slug);
      }
    }

    // Apply only allowed instructor fields. Exclude isPremium, price, instructorId, createdBy, status, etc.
    course.applyEdits({
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
    });

    return this.courseRepo.update(course);
  }
}
