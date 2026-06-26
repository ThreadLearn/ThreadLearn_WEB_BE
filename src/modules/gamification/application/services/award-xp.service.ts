import { Inject, Injectable } from '@nestjs/common';
import { IUserStatsRepository, USER_STATS_REPOSITORY } from '../../domain/interfaces/user-stats.repository';

/**
 * UC48: Accumulate Experience Points - XP Engine (Student, XP System)
 * Service to award XP to user stats profile and recalculate level.
 */
@Injectable()
export class AwardXpService {
  constructor(
    @Inject(USER_STATS_REPOSITORY)
    private readonly userStatsRepository: IUserStatsRepository,
  ) {}

  async execute(userId: string, xpAmount: number, quizzesCompletedDelta = 0) {
    const stats = await this.userStatsRepository.findOrCreate(userId);
    stats.addXp(xpAmount, quizzesCompletedDelta);
    await this.userStatsRepository.save(stats);

    return stats;
  }
}
