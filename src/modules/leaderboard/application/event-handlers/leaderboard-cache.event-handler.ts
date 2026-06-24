import { Inject, Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ILeaderboardCachePort, LEADERBOARD_CACHE_PORT } from '../../domain/interfaces/leaderboard-cache.port';

/**
 * Event handler: lắng nghe các event thay đổi XP để invalidate cache leaderboard.
 * Sử dụng @nestjs/event-emitter (EventEmitter2 singleton toàn app).
 */
@Injectable()
export class LeaderboardCacheEventHandler {
  constructor(
    @Inject(LEADERBOARD_CACHE_PORT)
    private readonly cachePort: ILeaderboardCachePort,
  ) {}

  @OnEvent('quiz.passed')
  async onQuizPassed() {
    await this.cachePort.invalidate();
  }

  @OnEvent('lesson.completed')
  async onLessonCompleted() {
    await this.cachePort.invalidate();
  }

  @OnEvent('course.completed')
  async onCourseCompleted() {
    await this.cachePort.invalidate();
  }
}
