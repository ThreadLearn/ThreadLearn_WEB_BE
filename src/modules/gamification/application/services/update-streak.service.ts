import { Inject, Injectable } from '@nestjs/common';
import { IUserStatsRepository, USER_STATS_REPOSITORY } from '../../domain/interfaces/user-stats.repository';

/**
 * Streak tracking service helper for Gamification Module.
 * Recalculates and updates the user's daily activity login streak.
 */
@Injectable()
export class UpdateStreakService {
  constructor(
    @Inject(USER_STATS_REPOSITORY)
    private readonly userStatsRepository: IUserStatsRepository,
  ) {}

  async execute(userId: string, now: Date = new Date()) {
    const stats = await this.userStatsRepository.findByUserId(userId);
    if (!stats) return;

    stats.updateStreak(now);
    await this.userStatsRepository.save(stats);

    return stats;
  }
}
