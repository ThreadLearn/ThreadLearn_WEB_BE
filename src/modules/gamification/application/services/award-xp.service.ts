import { Inject, Injectable } from '@nestjs/common';
import { NotFoundError } from '../../../../common/custom-error';
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

  async execute(userId: string, xpAmount: number, quizzesCompletedDelta = 0, now: Date = new Date()) {
    const stats = await this.userStatsRepository.findByUserId(userId);
    if (!stats) {
      throw new NotFoundError('User stats profile not found.');
    }

    stats.addXp(xpAmount, quizzesCompletedDelta, now);
    await this.userStatsRepository.save(stats);

    return stats;
  }
}
