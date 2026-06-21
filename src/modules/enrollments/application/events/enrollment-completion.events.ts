export interface LessonCompletedEvent {
  userId: string;
  lessonId: string;
  lessonTitle: string;
  courseId: string;
  progressPercent: number;
  totalLessons: number;
  completedLessons: number;
  alreadyCompleted: boolean;
  courseCompleted: boolean;
}

export interface CourseCompletedEvent {
  userId: string;
  courseId: string;
  progressPercent: number;
  totalLessons: number;
  completedLessons: number;
}

export interface CompletionEffects {
  xpRewarded: number;
  stats: unknown;
}
