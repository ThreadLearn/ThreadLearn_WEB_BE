import { Injectable, Optional } from '@nestjs/common';
import { EventEmitter } from 'events';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * DomainEventPublisher (Legacy Bridge)
 * 
 * Vừa giữ EventEmitter cục bộ (cho các module cũ chưa refactor),
 * vừa bridge (cầu nối) sang global EventEmitter2 (cho kiến trúc mới).
 * Nhờ @Optional(), module nào không có EventEmitter2 vẫn không bị lỗi DI.
 */
@Injectable()
export class DomainEventPublisher {
  private readonly emitter = new EventEmitter();

  constructor(@Optional() private readonly globalEmitter?: EventEmitter2) {}

  publish(event: string, data: any) {
    // 1. Phát event cục bộ cho legacy handler
    this.emitter.emit(event, data);
    // 2. Phát event ra toàn cục (cho Gamification, Leaderboard)
    if (this.globalEmitter) {
      this.globalEmitter.emit(event, data);
    }
  }

  subscribe(event: string, handler: (data: any) => void) {
    // 1. Nghe event cục bộ
    this.emitter.on(event, handler);
    // 2. Nghe event toàn cục (nếu cần)
    if (this.globalEmitter) {
      this.globalEmitter.on(event, handler);
    }
  }
}
