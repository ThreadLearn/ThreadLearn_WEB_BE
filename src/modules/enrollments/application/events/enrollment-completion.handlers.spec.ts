import { CertificatesService } from '../../../certificates/services/certificates.service';
import { NotificationsService } from '../../../notifications/services/notifications.service';
import { CertificatesHandler } from './certificates.handler';
import { NotificationsHandler } from './notifications.handler';

describe('enrollment completion event handlers', () => {
  const lessonEvent = {
    userId: 'student-1',
    lessonId: 'lesson-1',
    lessonTitle: 'Events in NestJS',
    courseId: 'course-1',
    progressPercent: 50,
    totalLessons: 2,
    completedLessons: 1,
    alreadyCompleted: false,
    courseCompleted: false,
    enrollmentCompleted: false,
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('sends a lesson notification for a non-final lesson', async () => {
    const send = jest.spyOn(NotificationsService, 'sendNotification').mockResolvedValue({} as never);

    await new NotificationsHandler({ subscribe: jest.fn() }).onLessonCompleted(lessonEvent);

    expect(send).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'student-1',
      type: 'LESSON_COMPLETED',
      metadata: { lessonId: 'lesson-1', courseId: 'course-1' },
    }));
  });

  it('lets course.completed own the notification for the final lesson', async () => {
    const send = jest.spyOn(NotificationsService, 'sendNotification').mockResolvedValue({} as never);
    const handler = new NotificationsHandler({ subscribe: jest.fn() });

    await handler.onLessonCompleted({ ...lessonEvent, courseCompleted: true });
    await handler.onCourseCompleted({
      userId: 'student-1',
      courseId: 'course-1',
      progressPercent: 100,
      totalLessons: 2,
      completedLessons: 2,
    });

    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith(expect.objectContaining({
      type: 'COURSE_COMPLETED',
      metadata: { courseId: 'course-1' },
    }));
  });

  it('issues the certificate from the eligibility event', async () => {
    const issue = jest.spyOn(CertificatesService, 'issueCertificate').mockResolvedValue({} as never);

    await new CertificatesHandler({ subscribe: jest.fn() }).onCertificateEligible({
      userId: 'student-1',
      courseId: 'course-1',
    });

    expect(issue).toHaveBeenCalledWith('student-1', 'course-1');
  });
});
