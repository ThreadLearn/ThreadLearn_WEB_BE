import { LessonProgressEntity } from '../entities/lesson-progress.entity';

export interface ILessonProgressRepository {
  upsertCompleted(progress: LessonProgressEntity): Promise<void>;
}

export const LESSON_PROGRESS_REPOSITORY = Symbol('LESSON_PROGRESS_REPOSITORY');
