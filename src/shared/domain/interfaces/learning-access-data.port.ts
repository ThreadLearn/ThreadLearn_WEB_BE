export interface LessonAccessSnapshot {
  id: string;
  courseId: string;
  status: string;
  isPreview: boolean;
  isLocked: boolean;
  title: string;
}

export interface CourseAccessSnapshot {
  id: string;
  status: string;
  isPremium: boolean;
}

export interface ILearningAccessData {
  findLesson(lessonId: string): Promise<LessonAccessSnapshot | null>;
  findCourse(courseId: string): Promise<CourseAccessSnapshot | null>;
  isEnrolled(userId: string, courseId: string): Promise<boolean>;
  hasActivePremium(userId: string): Promise<boolean>;
}

export const LEARNING_ACCESS_DATA = Symbol('LEARNING_ACCESS_DATA');
