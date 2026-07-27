import { Global, Module } from '@nestjs/common';
import { EVENT_PUBLISHER } from '../../application/events/event-publisher.port';
import { NestEventPublisher } from './nest-event.publisher';

@Global()
@Module({
  providers: [
    NestEventPublisher,
    {
      provide: EVENT_PUBLISHER,
      useExisting: NestEventPublisher,
    },
  ],
  exports: [EVENT_PUBLISHER],
})
export class SharedEventsModule {}
