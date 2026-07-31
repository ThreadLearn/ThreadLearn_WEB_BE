import type { CourseAccessSnapshot, LessonAccessSnapshot } from './learning-access-data.port';

export type LearningAccessReason =
  | 'ADMIN'
  | 'INSTRUCTOR'
  | 'PREVIEW'
  | 'ENROLLED'
  | 'NOT_ENROLLED'
  | 'LESSON_LOCKED'
  | 'LESSON_NOT_FOUND'
  | 'PREMIUM_REQUIRED';

export interface LearningAccessViewer {
  id?: string;
  role?: string;
}

export interface LearningAccessResult {
  canView: boolean;
  reason: LearningAccessReason;
}

export interface AssertLearningAccessOptions {
  allowPreview?: boolean;
}

export interface ILearningAccess {
  checkLessonAccess(lessonId: string, viewer?: LearningAccessViewer): Promise<LearningAccessResult>;
  assertLessonAccess(
    lessonId: string,
    viewer: LearningAccessViewer,
    options?: AssertLearningAccessOptions,
  ): Promise<LessonAccessSnapshot>;
  assertLessonViewAccess(lessonId: string, viewer: LearningAccessViewer): Promise<LessonAccessSnapshot>;
  assertLessonInteractionAccess(lessonId: string, viewer: LearningAccessViewer): Promise<LessonAccessSnapshot>;
  assertCourseInteractionAccess(courseId: string, viewer: LearningAccessViewer): Promise<CourseAccessSnapshot>;
  /** Best-effort: ghi cursor resume (lastLessonId/lastAccessedAt) khi học viên mở bài. */
  touchLessonCursor(userId: string, courseId: string, lessonId: string): Promise<void>;
}

export const LEARNING_ACCESS = Symbol('LEARNING_ACCESS');
