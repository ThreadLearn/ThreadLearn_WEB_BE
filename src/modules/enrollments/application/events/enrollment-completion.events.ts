export const ENROLLMENT_COMPLETION_EVENTS = {
  lessonCompleted: 'lesson.completed',
  courseCompleted: 'course.completed',
  certificateEligible: 'course.certificate.eligible',
} as const;

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
  enrollmentCompleted: boolean;
}

export interface CourseCompletedEvent {
  userId: string;
  courseId: string;
  progressPercent: number;
  totalLessons: number;
  completedLessons: number;
}

export interface CertificateEligibleEvent {
  userId: string;
  courseId: string;
}

export interface CompletionEffects {
  xpRewarded: number;
  stats: unknown;
}
