import { NotificationsService } from '../../../notifications/services/notifications.service';
import { CourseCompletedEvent, LessonCompletedEvent } from './enrollment-completion.events';

export class NotificationsHandler {
  static async onLessonCompleted(event: LessonCompletedEvent): Promise<void> {
    if (event.alreadyCompleted) return;
    if (event.courseCompleted) {
      await NotificationsService.sendNotification({
        userId: event.userId,
        title: 'Course completed 🏆',
        message: 'Xuất sắc! Bạn đã hoàn thành khoá học. Certificate đã được cấp.',
        type: 'COURSE_COMPLETED',
        metadata: { courseId: event.courseId },
        link: `/courses/${event.courseId}`,
      });
      return;
    }

    await NotificationsService.sendNotification({
      userId: event.userId,
      title: 'Lesson completed',
      message: `Bạn đã hoàn thành bài "${event.lessonTitle}". Progress: ${event.progressPercent}%.`,
      type: 'LESSON_COMPLETED',
      metadata: { lessonId: event.lessonId, courseId: event.courseId },
      link: `/lessons/${event.lessonId}`,
    });
  }

  static async onCourseCompleted(event: CourseCompletedEvent): Promise<void> {
    await NotificationsService.sendNotification({
      userId: event.userId,
      title: 'Course completed 🏆',
      message: 'Xuất sắc! Bạn đã hoàn thành khoá học. Certificate đã được cấp.',
      type: 'COURSE_COMPLETED',
      metadata: { courseId: event.courseId },
      link: `/courses/${event.courseId}`,
    });
  }
}
