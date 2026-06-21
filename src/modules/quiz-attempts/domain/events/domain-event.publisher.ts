import { Injectable } from '@nestjs/common';
import { EventEmitter } from 'events';

@Injectable()
export class DomainEventPublisher {
  private readonly emitter = new EventEmitter();

  publish(event: string, data: any) {
    this.emitter.emit(event, data);
  }

  subscribe(event: string, handler: (data: any) => void) {
    this.emitter.on(event, handler);
  }
}
