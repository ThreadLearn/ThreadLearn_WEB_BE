import { EnrollmentEntity } from '../entities/enrollment.entity';

export interface EnrollmentCourseView {
  _id?: string;
  id?: string;
  title?: string;
  slug?: string;
  thumbnailUrl?: string;
  level?: string;
  language?: string;
  status?: string;
  isPremium?: boolean;
  totalLessons?: number;
}

export interface EnrollmentView {
  _id: string;
  id: string;
  userId: string;
  courseId: string | EnrollmentCourseView;
  progress: number;
  progressPercent: number;
  completedLessons: string[];
  totalLessons: number;
  lastLessonId?: string;
  completed: boolean;
  completedAt?: Date;
  enrolledAt: Date;
  lastAccessedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IEnrollmentRepository {
  findByUserAndCourse(userId: string, courseId: string): Promise<EnrollmentEntity | null>;
  findById(id: string): Promise<EnrollmentEntity | null>;
  listByUser(userId: string): Promise<EnrollmentView[]>;
  findActiveResume(userId: string): Promise<EnrollmentView | null>;
  create(enrollment: EnrollmentEntity): Promise<EnrollmentEntity>;
  update(enrollment: EnrollmentEntity): Promise<EnrollmentEntity>;
}

export const ENROLLMENT_REPOSITORY = Symbol('ENROLLMENT_REPOSITORY');
