import { Inject, Injectable } from '@nestjs/common';
import { IUserStatsRepository } from '../../domain/ports/user-stats.repository.interface';

/**
 * Streak tracking service helper for Gamification Module.
 * Recalculates and updates the user's daily activity login streak.
 */
@Injectable()
export class UpdateStreakService {
  constructor(
    @Inject('IUserStatsRepository')
    private readonly userStatsRepository: IUserStatsRepository,
  ) {}

  async execute(userId: string) {
    const stats = await this.userStatsRepository.findByUserId(userId);
    if (!stats) return;

    const now = new Date();
    const lastActive = new Date(stats.lastActiveDate);
    const diffDays = Math.floor(
      (now.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 1) {
      stats.currentStreak += 1;
      if (stats.currentStreak > stats.highestStreak) {
        stats.highestStreak = stats.currentStreak;
      }
    } else if (diffDays > 1) {
      stats.currentStreak = 1;
    }

    stats.lastActiveDate = now;
    await this.userStatsRepository.save(stats);

    return stats;
  }
}
