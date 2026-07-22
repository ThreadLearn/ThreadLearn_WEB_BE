import { Inject, Injectable } from '@nestjs/common';
import { ForbiddenError, NotFoundError } from '../../../../common/custom-error';
import {
  ILearningAccess,
  LEARNING_ACCESS,
} from '../../../../shared/domain/interfaces/learning-access.port';
import {
  ILessonReadPort,
  LESSON_READ_PORT,
} from '../../../lessons/domain/interfaces/lesson-read.port';
import { LessonProgressEntity } from '../../domain/entities/lesson-progress.entity';
import {
  ENROLLMENT_REPOSITORY,
  IEnrollmentRepository,
} from '../../domain/interfaces/enrollment.repository';
import {
  ILessonProgressRepository,
  LESSON_PROGRESS_REPOSITORY,
} from '../../domain/interfaces/lesson-progress.repository';
import { EnrollmentCompletionPublisher } from '../events/enrollment-completion.publisher';

@Injectable()
export class CompleteLessonService {
  constructor(
    @Inject(LEARNING_ACCESS) private readonly access: ILearningAccess,
    @Inject(LESSON_READ_PORT) private readonly lessons: ILessonReadPort,
    @Inject(ENROLLMENT_REPOSITORY) private readonly enrollments: IEnrollmentRepository,
    @Inject(LESSON_PROGRESS_REPOSITORY) private readonly progress: ILessonProgressRepository,
    private readonly completionPublisher: EnrollmentCompletionPublisher,
  ) {}

  async execute(userId: string, lessonId: string) {
    await this.access.assertLessonInteractionAccess(lessonId, { id: userId, role: 'STUDENT' });

    const lesson = await this.lessons.getForCompletion(lessonId);
    if (!lesson) throw new NotFoundError('Lesson not found.');
    if (lesson.status === 'locked' || lesson.isLocked) throw new ForbiddenError('Lesson is locked.');

    const enrollment = await this.enrollments.findByUserAndCourse(userId, lesson.courseId);
    if (!enrollment) throw new ForbiddenError('You must enroll before completing this lesson.');

    const totalLessons = await this.lessons.countCourseLessons(lesson.courseId);
    const markResult = enrollment.markLessonCompleted(lesson.id, totalLessons);

    await this.progress.upsertCompleted(
      LessonProgressEntity.markCompleted({
        userId,
        courseId: lesson.courseId,
        lessonId: lesson.id,
      }),
    );
    const updated = await this.enrollments.update(enrollment);
    const props = updated.toProps();

    const effects = await this.completionPublisher.publishLessonCompleted({
      userId,
      lessonId: lesson.id,
      lessonTitle: lesson.title,
      courseId: lesson.courseId,
      progressPercent: props.progress,
      totalLessons,
      completedLessons: props.completedLessons.length,
      alreadyCompleted: !markResult.firstTime,
      courseCompleted: markResult.justCompleted,
    });

    return {
      enrollment: updated,
      totalLessons,
      completedLessons: props.completedLessons.length,
      progressPercent: props.progress,
      courseCompleted: props.completed,
      xpRewarded: effects.xpRewarded,
      stats: effects.stats,
    };
  }
}
