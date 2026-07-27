import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import {
  EVENT_PUBLISHER,
  EventSubscriber,
} from '../../../../shared/application/events/event-publisher.port';
import { CertificatesService } from '../../../certificates/services/certificates.service';
import {
  CourseCompletedEvent,
  ENROLLMENT_COMPLETION_EVENTS,
} from './enrollment-completion.events';

@Injectable()
export class CertificatesHandler implements OnModuleInit {
  constructor(
    @Inject(EVENT_PUBLISHER)
    private readonly eventBus: EventSubscriber,
  ) {}

  onModuleInit(): void {
    this.eventBus.subscribe<CourseCompletedEvent>(
      ENROLLMENT_COMPLETION_EVENTS.courseCompleted,
      this.onCourseCompleted.bind(this),
    );
  }

  async onCourseCompleted(event: CourseCompletedEvent): Promise<void> {
    await CertificatesService.issueCertificate(event.userId, event.courseId);
  }
}
