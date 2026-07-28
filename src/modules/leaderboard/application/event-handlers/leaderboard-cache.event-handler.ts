import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import {
  EVENT_PUBLISHER,
  EventSubscriber,
} from '../../../../shared/application/events/event-publisher.port';
import { ILeaderboardCachePort, LEADERBOARD_CACHE_PORT } from '../../domain/interfaces/leaderboard-cache.port';

/**
 * Event handler: lắng nghe các event thay đổi XP để invalidate cache leaderboard.
 */
@Injectable()
export class LeaderboardCacheEventHandler implements OnModuleInit {
  constructor(
    @Inject(LEADERBOARD_CACHE_PORT)
    private readonly cachePort: ILeaderboardCachePort,
    @Inject(EVENT_PUBLISHER)
    private readonly eventBus: EventSubscriber,
  ) {}

  onModuleInit(): void {
    this.eventBus.subscribe('quiz.passed', this.onQuizPassed.bind(this));
    this.eventBus.subscribe('lesson.completed', this.onLessonCompleted.bind(this));
    this.eventBus.subscribe('course.completed', this.onCourseCompleted.bind(this));
  }

  async onQuizPassed() {
    await this.cachePort.invalidate();
  }

  async onLessonCompleted() {
    await this.cachePort.invalidate();
  }

  async onCourseCompleted() {
    await this.cachePort.invalidate();
  }
}
