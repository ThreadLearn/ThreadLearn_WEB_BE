import { Inject, Injectable } from '@nestjs/common';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../../../common/custom-error';
import {
  ILearningAccessData,
  LEARNING_ACCESS_DATA,
} from '../../../../shared/domain/interfaces/learning-access-data.port';
import {
  COURSE_REPOSITORY,
  ICourseRepository,
} from '../../../course/domain/interfaces/course.repository';
import {
  ILessonReadPort,
  LESSON_READ_PORT,
} from '../../../lessons/domain/interfaces/lesson-read.port';
import { NotificationsService } from '../../../notifications/services/notifications.service';
import { EnrollmentEntity } from '../../domain/entities/enrollment.entity';
import {
  ENROLLMENT_REPOSITORY,
  IEnrollmentRepository,
} from '../../domain/interfaces/enrollment.repository';

@Injectable()
export class EnrollInCourseService {
  constructor(
    @Inject(ENROLLMENT_REPOSITORY) private readonly enrollments: IEnrollmentRepository,
    @Inject(COURSE_REPOSITORY) private readonly courses: ICourseRepository,
    @Inject(LESSON_READ_PORT) private readonly lessons: ILessonReadPort,
    @Inject(LEARNING_ACCESS_DATA) private readonly accessData: ILearningAccessData,
  ) {}

  async execute(userId: string, courseId: string) {
    const course = await this.courses.findById(courseId);
    const courseProps = course?.toProps();
    if (!courseProps || ['deleted', 'hidden', 'archived'].includes(courseProps.status)) {
      throw new NotFoundError('Course not found.');
    }
    if (courseProps.status !== 'published') {
      throw new ForbiddenError('This course is not available for enrollment.', 'COURSE_ACCESS_DENIED');
    }
    if (courseProps.isPremium) {
      const isPremium = await this.accessData.hasActivePremium(userId);
      if (!isPremium) {
        throw new ForbiddenError(
          'An active Premium plan is required to enroll in this course.',
          'COURSE_PREMIUM_REQUIRED',
        );
      }
    }

    const existing = await this.enrollments.findByUserAndCourse(userId, courseId);
    if (existing) {
      throw new BadRequestError('User is already enrolled in this course.');
    }

    const missingPrerequisites: string[] = [];
    for (const prerequisiteId of courseProps.prerequisites ?? []) {
      const prerequisiteEnrollment = await this.enrollments.findByUserAndCourse(userId, prerequisiteId);
      if (!prerequisiteEnrollment || prerequisiteEnrollment.toProps().progress < courseProps.prerequisiteThreshold) {
        missingPrerequisites.push(prerequisiteId);
      }
    }
    if (missingPrerequisites.length) {
      throw new ForbiddenError(
        'Complete the required prerequisite before enrolling in this course.',
        'COURSE_PREREQUISITE_REQUIRED',
      );
    }

    const totalLessons = await this.lessons.countCourseLessons(courseId);
    const enrollment = await this.enrollments.create(
      EnrollmentEntity.createInitial({ userId, courseId, totalLessons }),
    );
    await this.courses.incrementEnrollmentCount(courseId);

    await NotificationsService.sendNotification({
      userId,
      title: 'Enrolled in course',
      message: `Báº¡n Ä‘Ã£ tham gia khoÃ¡ há»c "${courseProps.title}".`,
      type: 'COURSE_ENROLLED',
      metadata: { courseId },
      link: `/courses/${courseId}`,
    });

    return enrollment;
  }
}
