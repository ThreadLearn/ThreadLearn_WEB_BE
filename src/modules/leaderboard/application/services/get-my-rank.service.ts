import { Inject, Injectable } from '@nestjs/common';
import { IUserStatsRepository, USER_STATS_REPOSITORY } from '../../../gamification/domain/interfaces/user-stats.repository';

/**
 * UC50-2: Get My Rank
 * Đọc rank + xp của user hiện tại qua gamification port.
 */
@Injectable()
export class GetMyRankService {
  constructor(
    @Inject(USER_STATS_REPOSITORY)
    private readonly userStatsRepository: IUserStatsRepository,
  ) {}

  async execute(userId: string): Promise<{ rank: number | null; xp: number }> {
    const stats = await this.userStatsRepository.findByUserId(userId);
    if (!stats) return { rank: null, xp: 0 };

    const rank = await this.userStatsRepository.findRankByUserId(userId);
    return { rank, xp: stats.xp };
  }
}
