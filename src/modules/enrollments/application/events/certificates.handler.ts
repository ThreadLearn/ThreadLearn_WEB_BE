import { CertificatesService } from '../../../certificates/services/certificates.service';
import { CourseCompletedEvent, LessonCompletedEvent } from './enrollment-completion.events';

export class CertificatesHandler {
  static async onLessonCompleted(event: LessonCompletedEvent): Promise<void> {
    if (!event.courseCompleted) return;
    await CertificatesService.issueCertificate(event.userId, event.courseId);
  }

  static async onCourseCompleted(event: CourseCompletedEvent): Promise<void> {
    await CertificatesService.issueCertificate(event.userId, event.courseId);
  }
}
