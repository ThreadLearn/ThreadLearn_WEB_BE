import { Injectable, OnModuleInit } from '@nestjs/common';
import { DomainEventPublisher } from '../../domain/events/domain-event.publisher';
import { QuizPassedEvent } from '../../domain/events/quiz-passed.event';
import { LeaderboardService } from '../../../leaderboard/services/leaderboard.service';

/**
 * Handles leaderboard cache invalidation on quiz completion.
 * Subscribes directly to QuizPassedEvent to keep the event flow flat.
 */
@Injectable()
export class LeaderboardEventHandler implements OnModuleInit {
  constructor(private readonly eventPublisher: DomainEventPublisher) {}

  onModuleInit() {
    this.eventPublisher.subscribe('quiz.passed', async (event: QuizPassedEvent) => {
      await LeaderboardService.invalidateCache();
    });
  }
}
