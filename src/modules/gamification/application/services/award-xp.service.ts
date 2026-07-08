import { Inject, Injectable } from '@nestjs/common';
import { UserStats } from '../../domain/entities/user-stats.entity';
import {
  IUserStatsRepository,
  USER_STATS_REPOSITORY,
  XpAwardSourceType,
} from '../../domain/interfaces/user-stats.repository';

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

  async executeOnce(
    userId: string,
    xpAmount: number,
    quizzesCompletedDelta: number,
    sourceType: XpAwardSourceType,
    sourceId: string,
  ): Promise<{ stats: UserStats; awarded: boolean }> {
    const awarded = await this.userStatsRepository.claimXpAward(sourceType, sourceId, userId);
    const stats = await this.userStatsRepository.findOrCreate(userId);

    if (!awarded) {
      return { stats, awarded: false };
    }

    stats.addXp(xpAmount, quizzesCompletedDelta);
    const saved = await this.userStatsRepository.save(stats);

    return { stats: saved, awarded: true };
  }
}
