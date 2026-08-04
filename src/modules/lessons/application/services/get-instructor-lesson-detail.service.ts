import { Injectable } from '@nestjs/common';
import { CourseManagementActor } from '../../../course/application/policies/course-management.policy';
import { InstructorLessonAccessResolver } from './instructor-lesson-access.resolver';

@Injectable()
export class GetInstructorLessonDetailService {
  constructor(private readonly resolver: InstructorLessonAccessResolver) {}

  async execute(actor: CourseManagementActor, lessonId: string) {
    const { lesson, section, course } = await this.resolver.assertCanReadLessonDetail(actor, lessonId);
    return { lesson, section, course };
  }
}
