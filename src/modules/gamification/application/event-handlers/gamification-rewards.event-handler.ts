import { Inject, Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { COURSE_COMPLETION_XP, LESSON_COMPLETION_XP } from '../../constants';
import {
  GAMIFICATION_REALTIME_PORT,
  IGamificationRealtimePort,
} from '../../domain/interfaces/gamification-realtime.port';
import { AwardXpService } from '../services/award-xp.service';
import { UpdateStreakService } from '../services/update-streak.service';

interface LessonCompletedEvent {
  userId: string;
  lessonId: string;
}

interface CourseCompletedEvent {
  userId: string;
  courseId: string;
}

interface RewardEffects {
  xpRewarded: number;
  stats: unknown;
}

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
  async handleLessonCompleted(event: LessonCompletedEvent): Promise<RewardEffects> {
    return this.awardCompletionXp({
      userId: event.userId,
      xpAmount: LESSON_COMPLETION_XP,
      sourceType: 'lesson_completion',
      sourceId: event.lessonId,
      eventName: 'lesson.completed',
    });
  }

  @OnEvent('course.completed')
  async handleCourseCompleted(event: CourseCompletedEvent): Promise<RewardEffects> {
    return this.awardCompletionXp({
      userId: event.userId,
      xpAmount: COURSE_COMPLETION_XP,
      sourceType: 'course_completion',
      sourceId: event.courseId,
      eventName: 'course.completed',
    });
  }

  @OnEvent('quiz.passed')
  async handleQuizPassed(event: {
    userId: string;
    quizId: string;
    attemptId?: string;
    xpReward: number;
  }) {
    this.logger.log(`[Gamification] Processing quiz.passed XP for user ${event.userId}`);
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
        this.logger.log(`[Gamification] Skipped duplicate quiz XP source ${sourceId}`);
        return;
      }

      await this.updateStreakService.execute(event.userId);
      this.emitRealtime(event.userId, event.xpReward, stats);
    } catch (error) {
      this.logger.error(`[Gamification] Failed quiz.passed XP for user ${event.userId}`, error);
      // Reward side effects use eventual consistency and must not roll back the quiz attempt.
    }
  }

  private async awardCompletionXp(input: {
    userId: string;
    xpAmount: number;
    sourceType: 'lesson_completion' | 'course_completion';
    sourceId: string;
    eventName: 'lesson.completed' | 'course.completed';
  }): Promise<RewardEffects> {
    this.logger.log(`[Gamification] Processing ${input.eventName} XP for user ${input.userId}`);

    try {
      const { stats, awarded } = await this.awardXpService.executeOnce({
        userId: input.userId,
        xpAmount: input.xpAmount,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
      });

      if (!awarded) return { xpRewarded: 0, stats: stats.toProps() };

      await this.updateStreakService.execute(input.userId);
      this.emitRealtime(input.userId, input.xpAmount, stats);
      return { xpRewarded: input.xpAmount, stats: stats.toProps() };
    } catch (error) {
      this.logger.error(
        `[Gamification] Failed ${input.eventName} XP for user ${input.userId}`,
        error,
      );
      return { xpRewarded: 0, stats: null };
    }
  }

  private emitRealtime(
    userId: string,
    xpReward: number,
    stats: { toProps(): { xp: number; level: number } },
  ) {
    const props = stats.toProps();
    this.realtimePort.emitXpAwarded(userId, {
      xp: xpReward,
      totalXp: props.xp,
      level: props.level,
    });
    this.realtimePort.emitLeaderboardUpdate();
  }
}
