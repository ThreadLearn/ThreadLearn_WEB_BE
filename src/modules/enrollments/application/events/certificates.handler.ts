import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import {
  EVENT_PUBLISHER,
  EventSubscriber,
} from '../../../../shared/application/events/event-publisher.port';
import { CertificatesService } from '../../../certificates/services/certificates.service';
import {
  CertificateEligibleEvent,
  ENROLLMENT_COMPLETION_EVENTS,
} from './enrollment-completion.events';

@Injectable()
export class CertificatesHandler implements OnModuleInit {
  constructor(
    @Inject(EVENT_PUBLISHER)
    private readonly eventBus: EventSubscriber,
  ) {}

  onModuleInit(): void {
    this.eventBus.subscribe<CertificateEligibleEvent>(
      ENROLLMENT_COMPLETION_EVENTS.certificateEligible,
      this.onCertificateEligible.bind(this),
    );
  }

  async onCertificateEligible(event: CertificateEligibleEvent): Promise<void> {
    await CertificatesService.issueCertificate(event.userId, event.courseId);
  }
}
