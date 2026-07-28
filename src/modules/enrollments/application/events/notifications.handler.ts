import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import {
  EVENT_PUBLISHER,
  EventSubscriber,
} from '../../../../shared/application/events/event-publisher.port';
import { NotificationsService } from '../../../notifications/services/notifications.service';
import {
  CourseCompletedEvent,
  ENROLLMENT_COMPLETION_EVENTS,
  LessonCompletedEvent,
} from './enrollment-completion.events';

@Injectable()
export class NotificationsHandler implements OnModuleInit {
  constructor(
    @Inject(EVENT_PUBLISHER)
    private readonly eventBus: EventSubscriber,
  ) {}

  onModuleInit(): void {
    this.eventBus.subscribe<LessonCompletedEvent>(
      ENROLLMENT_COMPLETION_EVENTS.lessonCompleted,
      this.onLessonCompleted.bind(this),
    );
    this.eventBus.subscribe<CourseCompletedEvent>(
      ENROLLMENT_COMPLETION_EVENTS.courseCompleted,
      this.onCourseCompleted.bind(this),
    );
  }

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

  async onCourseCompleted(event: CourseCompletedEvent): Promise<void> {
    await NotificationsService.sendNotification({
      userId: event.userId,
      title: 'Course completed',
      message:
        'Excellent work! You completed the course. View your learning credential in Certificates.',
      type: 'COURSE_COMPLETED',
      metadata: { courseId: event.courseId },
      link: '/certificates',
    });
  }
}
