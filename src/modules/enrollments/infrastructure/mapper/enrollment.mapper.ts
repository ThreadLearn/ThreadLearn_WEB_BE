import { EnrollmentEntity, EnrollmentProps } from '../../domain/entities/enrollment.entity';
import { EnrollmentCourseView, EnrollmentView } from '../../domain/interfaces/enrollment.repository';
import { IEnrollment } from '../../models/enrollment.model';

const idOf = (value: any): string | undefined => {
  if (!value) return undefined;
  if (typeof value === 'string') return value;
  if (value._id) return String(value._id);
  if (value.id) return String(value.id);
  return String(value);
};

const dateOf = (value: any): Date | undefined => (value ? new Date(value) : undefined);

export class EnrollmentMapper {
  static toEntity(doc: IEnrollment | any): EnrollmentEntity {
    return EnrollmentEntity.fromPersistence(this.toProps(doc));
  }

  static toProps(doc: IEnrollment | any): EnrollmentProps {
    return {
      id: String(doc._id ?? doc.id ?? ''),
      userId: String(idOf(doc.userId) ?? ''),
      courseId: String(idOf(doc.courseId) ?? ''),
      progress: Number(doc.progress ?? 0),
      progressPercent: Number(doc.progressPercent ?? doc.progress ?? 0),
      completedLessons: (doc.completedLessons ?? []).map((id: any) => String(idOf(id) ?? id)),
      totalLessons: Number(doc.totalLessons ?? 0),
      lastLessonId: idOf(doc.lastLessonId),
      completed: !!doc.completed,
      completedAt: dateOf(doc.completedAt),
      enrolledAt: dateOf(doc.enrolledAt) ?? new Date(),
      lastAccessedAt: dateOf(doc.lastAccessedAt),
      createdAt: dateOf(doc.createdAt),
      updatedAt: dateOf(doc.updatedAt),
    };
  }

  static toPersistence(entity: EnrollmentEntity): Record<string, any> {
    const props = entity.toProps();
    return {
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
    };
  }

  static toView(doc: any): EnrollmentView {
    const props = this.toProps(doc);
    return {
      _id: props.id,
      id: props.id,
      userId: props.userId,
      courseId: this.mapCourse(doc.courseId) ?? props.courseId,
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

  private static mapCourse(course: any): EnrollmentCourseView | undefined {
    if (!course || typeof course !== 'object' || !course.title) return undefined;
    const id = String(course._id ?? course.id ?? '');
    return {
      _id: id,
      id,
      title: course.title,
      slug: course.slug,
      thumbnailUrl: course.thumbnailUrl,
      level: course.level,
      language: course.language,
      status: course.status,
      isPremium: course.isPremium,
      totalLessons: course.totalLessons,
    };
  }
}
