import { Inject, Injectable } from '@nestjs/common';
import { NotFoundError } from '../../../../common/custom-error';
import { IUserStatsRepository } from '../../domain/ports/user-stats.repository.interface';
import { calculateLevel } from '../../domain/level-calculator';

/**
 * UC48: Accumulate Experience Points - XP Engine (Student, XP System)
 * Service to award XP to user stats profile and recalculate level.
 */
@Injectable()
export class AwardXpService {
  constructor(
    @Inject('IUserStatsRepository')
    private readonly userStatsRepository: IUserStatsRepository,
  ) {}

  async execute(userId: string, xpAmount: number, quizzesCompletedDelta = 0) {
    const stats = await this.userStatsRepository.findByUserId(userId);
    if (!stats) {
      throw new NotFoundError('User stats profile not found.');
    }

    stats.xp += xpAmount;
    stats.quizzesCompleted = (stats.quizzesCompleted ?? 0) + quizzesCompletedDelta;
    stats.level = calculateLevel(stats.xp);
    stats.lastActiveDate = new Date();
    await this.userStatsRepository.save(stats);

    return stats;
  }
}
