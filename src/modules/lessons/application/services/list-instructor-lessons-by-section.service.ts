import { Injectable } from '@nestjs/common';
import { CourseManagementActor } from '../../../course/application/policies/course-management.policy';
import { Lesson } from '../../models/lesson.model';
import { InstructorLessonAccessResolver } from './instructor-lesson-access.resolver';

@Injectable()
export class ListInstructorLessonsBySectionService {
  constructor(private readonly resolver: InstructorLessonAccessResolver) {}

  async execute(actor: CourseManagementActor, sectionId: string) {
    const { section } = await this.resolver.assertCanListLessons(actor, sectionId);
    const lessons = await Lesson.find({
      sectionId: section._id,
      status: { $ne: 'deleted' },
    }).sort({ orderIndex: 1 });
    return lessons;
  }
}
