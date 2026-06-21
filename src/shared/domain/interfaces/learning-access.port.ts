import type { ILesson } from '../../../modules/lessons/models/lesson.model';

export type LearningAccessReason =
  | 'ADMIN'
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
  ): Promise<ILesson>;
  assertLessonViewAccess(lessonId: string, viewer: LearningAccessViewer): Promise<ILesson>;
  assertLessonInteractionAccess(lessonId: string, viewer: LearningAccessViewer): Promise<ILesson>;
  assertCourseInteractionAccess(courseId: string, viewer: LearningAccessViewer): Promise<void>;
}

export const LEARNING_ACCESS = Symbol('LEARNING_ACCESS');
