import { RankedEntry } from '../interfaces/leaderboard-cache.port';
import { UserProfileDto } from '../interfaces/user-profile.port';

/**
 * Domain service thuần — KHÔNG I/O.
 * Chứa toán xếp hạng và merge dữ liệu.
 */
export class RankingDomainService {
  /**
   * Gắn rank (index + 1) và enrich profile vào danh sách stats đã sort giảm dần theo XP.
   * @param statsList — danh sách { userId, xp, level } đã sort desc by xp
   * @param profiles — map userId → { name, avatarUrl }
   */
  static buildRankedList(
    statsList: { userId: string; xp: number; level: number }[],
    profiles: UserProfileDto[],
  ): RankedEntry[] {
    const profileMap = new Map(profiles.map((p) => [p.userId, p]));

    return statsList.map((stat, index) => {
      const profile = profileMap.get(stat.userId);
      return {
        rank: index + 1,
        userId: stat.userId,
        name: profile?.name || 'Student',
        avatarUrl: profile?.avatarUrl,
        level: stat.level || Math.floor(stat.xp / 1000) + 1,
        xp: stat.xp,
      };
    });
  }
}
