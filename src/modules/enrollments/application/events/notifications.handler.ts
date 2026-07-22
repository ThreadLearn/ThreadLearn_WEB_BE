import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationsService } from '../../../notifications/services/notifications.service';
import {
  CourseCompletedEvent,
  ENROLLMENT_COMPLETION_EVENTS,
  LessonCompletedEvent,
} from './enrollment-completion.events';

@Injectable()
export class NotificationsHandler {
  @OnEvent(ENROLLMENT_COMPLETION_EVENTS.lessonCompleted)
  async onLessonCompleted(event: LessonCompletedEvent): Promise<void> {
    if (event.alreadyCompleted || event.courseCompleted) return;

    await NotificationsService.sendNotification({
      userId: event.userId,
      title: 'Lesson completed',
      message: `Bạn đã hoàn thành bài "${event.lessonTitle}". Progress: ${event.progressPercent}%.`,
      type: 'LESSON_COMPLETED',
      metadata: { lessonId: event.lessonId, courseId: event.courseId },
      link: `/lessons/${event.lessonId}`,
    });
  }

  @OnEvent(ENROLLMENT_COMPLETION_EVENTS.courseCompleted)
  async onCourseCompleted(event: CourseCompletedEvent): Promise<void> {
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
