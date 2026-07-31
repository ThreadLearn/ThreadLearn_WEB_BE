export interface LessonAccessSnapshot {
  id: string;
  courseId: string;
  status: string;
  isPreview: boolean;
  isLocked: boolean;
  title: string;
  thumbnailUrl?: string;
  contentLength?: number;
}

export interface CourseAccessSnapshot {
  id: string;
  status: string;
  isPremium: boolean;
  title: string;
  thumbnailUrl?: string;
  instructorId?: string;
  createdBy?: string;
}

export interface ILearningAccessData {
  findLesson(lessonId: string): Promise<LessonAccessSnapshot | null>;
  findCourse(courseId: string): Promise<CourseAccessSnapshot | null>;
  isEnrolled(userId: string, courseId: string): Promise<boolean>;
  hasActivePremium(userId: string): Promise<boolean>;
  /** Best-effort: cập nhật cursor resume của enrollment (lastLessonId/lastAccessedAt). */
  touchCursor(userId: string, courseId: string, lessonId: string): Promise<void>;
}

export const LEARNING_ACCESS_DATA = Symbol('LEARNING_ACCESS_DATA');
