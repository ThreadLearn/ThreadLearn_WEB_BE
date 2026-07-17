import { Inject, Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AwardXpService } from '../services/award-xp.service';
import { UpdateStreakService } from '../services/update-streak.service';
import { COURSE_COMPLETION_XP, LESSON_COMPLETION_XP } from '../../constants';
import {
  GAMIFICATION_REALTIME_PORT,
  IGamificationRealtimePort,
} from '../../domain/interfaces/gamification-realtime.port';

@Injectable()
export class GamificationRewardsEventHandler {
  private readonly logger = new Logger(GamificationRewardsEventHandler.name);

  constructor(
    private readonly awardXpService: AwardXpService,
    private readonly updateStreakService: UpdateStreakService,
    @Inject(GAMIFICATION_REALTIME_PORT)
    private readonly realtimePort: IGamificationRealtimePort,
  ) {}

  @OnEvent('lesson.completed')
  private async handleLessonCompleted(event: { userId: string, courseCompleted: boolean }) {
    this.logger.log(`[Gamification] Bắt đầu xử lý XP cho lesson.completed (User: ${event.userId})`);
    try {
      const xpReward = LESSON_COMPLETION_XP + (event.courseCompleted ? COURSE_COMPLETION_XP : 0);
      const stats = await this.awardXpService.execute(event.userId, xpReward, 0);
      await this.updateStreakService.execute(event.userId);
      this.emitRealtime(event.userId, xpReward, stats);
    } catch (error) {
      this.logger.error(`[Gamification Error] Lỗi xử lý lesson.completed cho user ${event.userId}:`, error);
    }
  }

  @OnEvent('course.completed')
  private async handleCourseCompleted(event: { userId: string }) {
    this.logger.log(`[Gamification] Bắt đầu xử lý XP cho course.completed (User: ${event.userId})`);
    try {
      const stats = await this.awardXpService.execute(event.userId, COURSE_COMPLETION_XP, 0);
      await this.updateStreakService.execute(event.userId);
      this.emitRealtime(event.userId, COURSE_COMPLETION_XP, stats);
    } catch (error) {
      this.logger.error(`[Gamification Error] Lỗi xử lý course.completed cho user ${event.userId}:`, error);
    }
  }

  @OnEvent('quiz.passed')
  private async handleQuizPassed(event: {
    userId: string;
    quizId: string;
    attemptId?: string;
    xpReward: number;
  }) {
    this.logger.log(`[Gamification] Bắt đầu xử lý XP cho user ${event.userId} (Quiz: ${event.quizId})`);
    try {
      const sourceId = event.attemptId ?? event.quizId;
      const { stats, awarded } = await this.awardXpService.executeOnce({
        userId: event.userId,
        xpAmount: event.xpReward,
        quizzesCompletedDelta: 1,
        sourceType: 'quiz_attempt',
        sourceId,
      });

      if (!awarded) {
        this.logger.log(`[Gamification] Bỏ qua XP trùng cho user ${event.userId} (source: ${sourceId})`);
        return;
      }

      await this.updateStreakService.execute(event.userId);
      this.emitRealtime(event.userId, event.xpReward, stats);
      this.logger.log(`[Gamification] Cấp ${event.xpReward} XP thành công cho user ${event.userId}`);
    } catch (error) {
      this.logger.error(`[Gamification Error] Không thể cấp XP cho user ${event.userId}:`, error);
      // Fallback không rollback quiz attempt (Eventual Consistency)
    }
  }

  private emitRealtime(userId: string, xpReward: number, stats: { toProps(): { xp: number; level: number } }) {
    const props = stats.toProps();
    this.realtimePort.emitXpAwarded(userId, {
      xp: xpReward,
      totalXp: props.xp,
      level: props.level,
    });
    this.realtimePort.emitLeaderboardUpdate();
  }
}
