import { Injectable, OnModuleInit } from '@nestjs/common';
import { DomainEventPublisher } from '../../domain/events/domain-event.publisher';
import { QuizPassedEvent } from '../../domain/events/quiz-passed.event';
import { XPGrantedEvent } from '../../domain/events/xp-granted.event';
import { GamificationService } from '../../../gamification/application/services/gamification.facade';

@Injectable()
export class GamificationEventHandler implements OnModuleInit {
  constructor(
    private readonly eventPublisher: DomainEventPublisher,
    private readonly gamificationService: GamificationService,
  ) {}

  onModuleInit() {
    this.eventPublisher.subscribe('quiz.passed', async (event: QuizPassedEvent) => {
      // UC48: Award XP and increment quizzesCompleted count
      await this.gamificationService.awardXP(event.userId, event.xpReward, 1);
      // Update Daily Streak
      await this.gamificationService.updateStreak(event.userId);
      // Emit XPGrantedEvent
      this.eventPublisher.publish('xp.granted', new XPGrantedEvent(event.userId, event.xpReward));
    });
  }
}
