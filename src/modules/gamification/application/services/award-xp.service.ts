import { Inject, Injectable } from '@nestjs/common';
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

  async executeOnce(input: {
    userId: string;
    xpAmount: number;
    quizzesCompletedDelta?: number;
    sourceType: XpAwardSourceType;
    sourceId: string;
  }) {
    const claimed = await this.userStatsRepository.claimXpAward(
      input.sourceType,
      input.sourceId,
      input.userId,
    );
    const stats = await this.userStatsRepository.findOrCreate(input.userId);

    if (!claimed) {
      return { stats, awarded: false };
    }

    stats.addXp(input.xpAmount, input.quizzesCompletedDelta ?? 0);
    const saved = await this.userStatsRepository.save(stats);

    return { stats: saved, awarded: true };
  }
}
