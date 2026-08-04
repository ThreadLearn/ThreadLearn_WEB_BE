import { Injectable } from '@nestjs/common';
import { BadRequestError } from '../../../../common/custom-error';
import { CourseManagementActor } from '../../../course/application/policies/course-management.policy';
import { Lesson } from '../../models/lesson.model';
import { InstructorLessonAccessResolver } from './instructor-lesson-access.resolver';

@Injectable()
export class ReorderInstructorLessonsService {
  constructor(private readonly resolver: InstructorLessonAccessResolver) {}

  async execute(
    actor: CourseManagementActor,
    sectionId: string,
    orderedLessonIds: string[],
  ) {
    const { section } = await this.resolver.assertCanAuthorSection(actor, sectionId);

    // 1. Check duplicate IDs in payload
    const uniqueIds = new Set(orderedLessonIds);
    if (uniqueIds.size !== orderedLessonIds.length) {
      throw new BadRequestError('Duplicate lesson IDs provided in reorder payload.');
    }

    // 2. Fetch all active lessons belonging to this section
    const activeLessons = await Lesson.find({
      sectionId: section._id,
      status: { $ne: 'deleted' },
    });

    const activeLessonIdMap = new Map(activeLessons.map((l: any) => [l._id.toString(), l]));

    // 3. Full-set validation: Payload length must match total active lessons count
    if (orderedLessonIds.length !== activeLessons.length) {
      throw new BadRequestError(
        `Reorder payload must contain all ${activeLessons.length} active lessons of the section. Received ${orderedLessonIds.length}.`,
      );
    }

    // 4. Verify all IDs in payload exist in activeLessons
    for (const id of orderedLessonIds) {
      if (!activeLessonIdMap.has(id)) {
        throw new BadRequestError(
          `Lesson ${id} is missing, deleted, or does not belong to section ${sectionId}.`,
        );
      }
    }

    // 5. Bulk write orderIndex updates
    const bulkOps = orderedLessonIds.map((id, index) => ({
      updateOne: {
        filter: { _id: id, sectionId: section._id },
        update: { $set: { orderIndex: index } },
      },
    }));

    if (bulkOps.length > 0) {
      await Lesson.bulkWrite(bulkOps);
    }

    return { sectionId, totalReordered: orderedLessonIds.length };
  }
}
