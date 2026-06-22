import { Injectable } from '@nestjs/common';
import { LessonProgressEntity } from '../../domain/entities/lesson-progress.entity';
import { ILessonProgressRepository } from '../../domain/interfaces/lesson-progress.repository';
import { LessonProgress } from '../../models/lesson-progress.model';

@Injectable()
export class MongoLessonProgressRepository implements ILessonProgressRepository {
  async upsertCompleted(progress: LessonProgressEntity): Promise<void> {
    const props = progress.toProps();
    await LessonProgress.findOneAndUpdate(
      { userId: props.userId, lessonId: props.lessonId },
      {
        $set: {
          courseId: props.courseId,
          isCompleted: props.isCompleted,
          completedAt: props.completedAt,
          lastAccessedAt: props.lastAccessedAt,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  }
}
