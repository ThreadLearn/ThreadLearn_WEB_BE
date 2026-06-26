import { Injectable } from '@nestjs/common';
import { EventEmitter } from 'events';

@Injectable()
export class DomainEventPublisher {
  private readonly emitter = new EventEmitter();

  publish<T>(event: string, data: T): void {
    this.emitter.emit(event, data);
  }

  subscribe<T>(event: string, handler: (data: T) => void | Promise<void>): void {
    this.emitter.on(event, handler);
  }
}
