import { Injectable, OnModuleInit } from '@nestjs/common';
import { DomainEventPublisher } from '../../../../shared/application/events/domain-event.publisher';
import { QuizPassedEvent } from '../../domain/events/quiz-passed.event';
import { AwardXpService } from '../../../gamification/application/services/award-xp.service';
import { UpdateStreakService } from '../../../gamification/application/services/update-streak.service';

/**
 * Lắng nghe sự kiện quiz.passed để thực hiện các side-effect về Gamification
 * như cộng XP và cập nhật streak.
 */
@Injectable()
export class GamificationEventHandler implements OnModuleInit {
  constructor(
    private readonly eventPublisher: DomainEventPublisher,
    private readonly awardXpService: AwardXpService,
    private readonly updateStreakService: UpdateStreakService,
  ) {}

  onModuleInit() {
    this.eventPublisher.subscribe('quiz.passed', this.handleQuizPassed.bind(this));
  }

  private async handleQuizPassed(event: QuizPassedEvent) {
    console.log(`[Gamification] Bắt đầu xử lý XP cho user ${event.userId} (Quiz: ${event.quizId})`);
    try {
      await this.awardXpService.execute(event.userId, event.xpReward, 1);
      await this.updateStreakService.execute(event.userId);
      console.log(`[Gamification] Cấp ${event.xpReward} XP thành công cho user ${event.userId}`);
    } catch (error) {
      console.error(`[Gamification Error] Không thể cấp XP cho user ${event.userId}:`, error);
      // Fallback không rollback quiz attempt (Eventual Consistency)
    }
  }
}
