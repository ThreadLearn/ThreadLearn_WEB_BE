import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { CertificatesService } from '../../../certificates/services/certificates.service';
import {
  CourseCompletedEvent,
  ENROLLMENT_COMPLETION_EVENTS,
} from './enrollment-completion.events';

@Injectable()
export class CertificatesHandler {
  @OnEvent(ENROLLMENT_COMPLETION_EVENTS.courseCompleted)
  async onCourseCompleted(event: CourseCompletedEvent): Promise<void> {
    await CertificatesService.issueCertificate(event.userId, event.courseId);
  }
}
