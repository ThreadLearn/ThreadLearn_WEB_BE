import { Injectable } from '@nestjs/common';
import { CourseManagementActor } from '../../../course/application/policies/course-management.policy';
import { SoftDeleteLessonService } from './soft-delete-lesson.service';
import { InstructorLessonAccessResolver } from './instructor-lesson-access.resolver';

@Injectable()
export class SoftDeleteInstructorLessonService {
  constructor(
    private readonly resolver: InstructorLessonAccessResolver,
    private readonly softDeleteLessonService: SoftDeleteLessonService,
  ) {}

  async execute(actor: CourseManagementActor, lessonId: string) {
    const { lesson } = await this.resolver.assertCanAuthorLesson(actor, lessonId);
    const result = await this.softDeleteLessonService.execute(lesson._id.toString());
    return result;
  }
}
