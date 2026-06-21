import { LessonVersionEntity } from '../entities/lesson-version.entity';

/** PORT: lịch sử version nội dung của bài học. */
export interface ILessonVersionRepository {
  /** Số version lớn nhất hiện có của 1 bài (0 nếu chưa có). */
  latestVersionNumber(lessonId: string): Promise<number>;
  /** Danh sách version sort giảm dần theo số version. */
  listByLesson(lessonId: string): Promise<LessonVersionEntity[]>;
  create(version: LessonVersionEntity): Promise<LessonVersionEntity>;
}

export const LESSON_VERSION_REPOSITORY = Symbol('LESSON_VERSION_REPOSITORY');
