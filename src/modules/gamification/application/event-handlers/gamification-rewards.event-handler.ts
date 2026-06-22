import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AwardXpService } from '../services/award-xp.service';
import { UpdateStreakService } from '../services/update-streak.service';
import { COURSE_COMPLETION_XP, LESSON_COMPLETION_XP } from '../../constants';

@Injectable()
export class GamificationRewardsEventHandler {
  constructor(
    private readonly awardXpService: AwardXpService,
    private readonly updateStreakService: UpdateStreakService,
  ) {}

  @OnEvent('lesson.completed')
  private async handleLessonCompleted(event: { userId: string, courseCompleted: boolean }) {
    console.log(`[Gamification] Bắt đầu xử lý XP cho lesson.completed (User: ${event.userId})`);
    try {
      const xpReward = LESSON_COMPLETION_XP + (event.courseCompleted ? COURSE_COMPLETION_XP : 0);
      await this.awardXpService.execute(event.userId, xpReward, 0);
      await this.updateStreakService.execute(event.userId);
    } catch (error) {
      console.error(`[Gamification Error] Lỗi xử lý lesson.completed cho user ${event.userId}:`, error);
    }
  }

  @OnEvent('course.completed')
  private async handleCourseCompleted(event: { userId: string }) {
    console.log(`[Gamification] Bắt đầu xử lý XP cho course.completed (User: ${event.userId})`);
    try {
      await this.awardXpService.execute(event.userId, COURSE_COMPLETION_XP, 0);
      await this.updateStreakService.execute(event.userId);
    } catch (error) {
      console.error(`[Gamification Error] Lỗi xử lý course.completed cho user ${event.userId}:`, error);
    }
  }
}
