import { Inject, Injectable } from '@nestjs/common';
import { IUserStatsRepository, USER_STATS_REPOSITORY } from '../../../gamification/domain/interfaces/user-stats.repository';
import { ILeaderboardCachePort, LEADERBOARD_CACHE_PORT, RankedEntry } from '../../domain/interfaces/leaderboard-cache.port';
import { IUserProfilePort, USER_PROFILE_PORT } from '../../domain/interfaces/user-profile.port';
import { RankingDomainService } from '../../domain/services/ranking.service';

/**
 * UC50-1: Get Top Rankings
 * Redis first → fallback DB + enrich profile → sync to cache.
 */
@Injectable()
export class GetTopRankingsService {
  constructor(
    @Inject(USER_STATS_REPOSITORY)
    private readonly userStatsRepository: IUserStatsRepository,
    @Inject(LEADERBOARD_CACHE_PORT)
    private readonly cachePort: ILeaderboardCachePort,
    @Inject(USER_PROFILE_PORT)
    private readonly userProfilePort: IUserProfilePort,
  ) {}

  async execute(limit: number): Promise<RankedEntry[]> {
    // 1. Try cache first
    const cached = await this.cachePort.getTopRankings(limit);
    if (cached) return cached;

    // 2. Fallback to DB via gamification port
    const topStats = await this.userStatsRepository.findTopByXp(limit);

    // 3. Enrich with user profiles
    const userIds = topStats.map((s) => s.userId);
    const profiles = await this.userProfilePort.findByUserIds(userIds);

    // 4. Build ranked list using domain service (pure logic)
    const statsList = topStats.map((s) => ({
      userId: s.userId,
      xp: s.xp,
      level: s.level,
    }));
    const rankedList = RankingDomainService.buildRankedList(statsList, profiles);

    // 5. Sync back to cache (fire-and-forget)
    this.cachePort.syncRankings(rankedList).catch(() => {});

    return rankedList;
  }
}
