import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  EventBus,
  EventHandler,
} from '../../application/events/event-publisher.port';

@Injectable()
export class NestEventPublisher implements EventBus {
  constructor(private readonly eventEmitter: EventEmitter2) {}

  publish<TPayload>(eventName: string, payload: TPayload): void {
    this.eventEmitter.emit(eventName, payload);
  }

  subscribe<TPayload>(
    eventName: string,
    handler: EventHandler<TPayload>,
  ): void {
    this.eventEmitter.on(eventName, handler);
  }
}
