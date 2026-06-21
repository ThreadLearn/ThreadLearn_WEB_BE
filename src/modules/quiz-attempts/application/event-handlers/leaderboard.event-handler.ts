import { Injectable, OnModuleInit } from '@nestjs/common';
import { DomainEventPublisher } from '../../domain/events/domain-event.publisher';
import { LeaderboardService } from '../../../leaderboard/services/leaderboard.service';

@Injectable()
export class LeaderboardEventHandler implements OnModuleInit {
  constructor(
    private readonly eventPublisher: DomainEventPublisher,
  ) {}

  onModuleInit() {
    this.eventPublisher.subscribe('xp.granted', async () => {
      await LeaderboardService.invalidateCache();
    });
  }
}
