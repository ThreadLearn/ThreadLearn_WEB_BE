import { EnrollmentEntity } from '../../domain/entities/enrollment.entity';
import { EnrollmentView } from '../../domain/interfaces/enrollment.repository';

export class EnrollmentPresenter {
  static toResponse(enrollment: unknown): EnrollmentView | null {
    if (!enrollment) return null;
    if (enrollment instanceof EnrollmentEntity) {
      const props = enrollment.toProps();
      return {
        _id: props.id,
        id: props.id,
        userId: props.userId,
        courseId: props.courseId,
        progress: props.progress,
        progressPercent: props.progressPercent,
        completedLessons: props.completedLessons,
        totalLessons: props.totalLessons,
        lastLessonId: props.lastLessonId,
        completed: props.completed,
        completedAt: props.completedAt,
        enrolledAt: props.enrolledAt,
        lastAccessedAt: props.lastAccessedAt,
        createdAt: props.createdAt,
        updatedAt: props.updatedAt,
      };
    }
    return enrollment as EnrollmentView;
  }

  static toList(enrollments: unknown[]) {
    return enrollments;
  }
}
