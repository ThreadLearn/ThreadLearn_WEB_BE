import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AwardXpService } from '../services/award-xp.service';
import { UpdateStreakService } from '../services/update-streak.service';
import { COURSE_COMPLETION_XP, LESSON_COMPLETION_XP } from '../../constants';

@Injectable()
export class GamificationRewardsEventHandler {
  private readonly logger = new Logger(GamificationRewardsEventHandler.name);

  constructor(
    private readonly awardXpService: AwardXpService,
    private readonly updateStreakService: UpdateStreakService,
  ) {}

  @OnEvent('lesson.completed')
  private async handleLessonCompleted(event: { userId: string, courseCompleted: boolean }) {
    this.logger.log(`[Gamification] Bắt đầu xử lý XP cho lesson.completed (User: ${event.userId})`);
    try {
      const xpReward = LESSON_COMPLETION_XP + (event.courseCompleted ? COURSE_COMPLETION_XP : 0);
      await this.awardXpService.execute(event.userId, xpReward, 0);
      await this.updateStreakService.execute(event.userId);
    } catch (error) {
      this.logger.error(`[Gamification Error] Lỗi xử lý lesson.completed cho user ${event.userId}:`, error);
    }
  }

  @OnEvent('course.completed')
  private async handleCourseCompleted(event: { userId: string }) {
    this.logger.log(`[Gamification] Bắt đầu xử lý XP cho course.completed (User: ${event.userId})`);
    try {
      await this.awardXpService.execute(event.userId, COURSE_COMPLETION_XP, 0);
      await this.updateStreakService.execute(event.userId);
    } catch (error) {
      this.logger.error(`[Gamification Error] Lỗi xử lý course.completed cho user ${event.userId}:`, error);
    }
  }

  @OnEvent('quiz.passed')
  private async handleQuizPassed(event: { userId: string; quizId: string; attemptId: string; xpReward: number }) {
    this.logger.log(`[Gamification] Bắt đầu xử lý XP cho user ${event.userId} (Quiz: ${event.quizId})`);
    try {
      const result = await this.awardXpService.executeOnce(
        event.userId,
        event.xpReward,
        1,
        'quiz_attempt',
        event.attemptId,
      );

      if (result.awarded) {
        await this.updateStreakService.execute(event.userId);
        this.logger.log(`[Gamification] Cấp ${event.xpReward} XP thành công cho user ${event.userId}`);
      } else {
        this.logger.log(`[Gamification] Bỏ qua XP quiz đã xử lý cho attempt ${event.attemptId}`);
      }
    } catch (error) {
      this.logger.error(`[Gamification Error] Không thể cấp XP cho user ${event.userId}:`, error);
      // Fallback không rollback quiz attempt (Eventual Consistency)
    }
  }
}
