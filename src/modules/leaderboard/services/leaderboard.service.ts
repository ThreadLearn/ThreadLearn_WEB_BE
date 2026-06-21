import { getRedisClient } from '../../../configs/redis';
import { UserStats } from '../../gamification/models/user-stats.model';
import { logger } from '../../../configs/logger';

export class LeaderboardService {
  private static LEADERBOARD_KEY = 'leaderboard:xp';

  static async invalidateCache() {
    try {
      const redis = getRedisClient();
      if (redis.isOpen) await redis.del(this.LEADERBOARD_KEY);
    } catch (err) {
      logger.warn('Leaderboard cache invalidation failed.', err);
    }
  }

  static async syncLeaderboardToRedis() {
    try {
      const redis = getRedisClient();
      if (!redis.isOpen) return;

      const stats = await UserStats.find().populate('userId', 'firstName lastName avatarUrl');
      for (const stat of stats) {
        if (stat.userId) {
          const displayName =
            `${(stat.userId as any).firstName ?? ''} ${(stat.userId as any).lastName ?? ''}`.trim() ||
            'Student';
          await redis.zAdd(this.LEADERBOARD_KEY, {
            score: stat.xp,
            value: JSON.stringify({
              userId: stat.userId._id,
              name: displayName,
              avatarUrl: (stat.userId as any).avatarUrl,
              level: stat.level,
            }),
          });
        }
      }
      logger.info('📊 Leaderboard synchronized successfully with Redis.');
    } catch (err) {
      logger.warn('⚠️ Redis sync failed. Leaderboard will query DB directly.', err);
    }
  }

  static async getMyRank(userId: string) {
    const stats = await UserStats.find().sort({ xp: -1 }).select('userId xp');
    const index = stats.findIndex((s) => s.userId?.toString() === userId);
    if (index === -1) return { rank: null, xp: 0 };
    return { rank: index + 1, xp: stats[index].xp };
  }

  static async getTopRankings(limit = 10) {
    try {
      const redis = getRedisClient();
      if (redis.isOpen) {
        const range = await redis.zRangeWithScores(this.LEADERBOARD_KEY, 0, limit - 1, {
          REV: true,
        });

        if (range.length > 0) {
          return range.map((item, index) => {
            const parsed = JSON.parse(item.value);
            return {
              rank: index + 1,
              userId: String(parsed.userId ?? ''),
              name: parsed.name ?? parsed.displayName ?? 'Student',
              avatarUrl: parsed.avatarUrl,
              level: Number(parsed.level) || Math.floor(item.score / 1000) + 1,
              xp: Number(item.score) || 0,
            };
          });
        }
      }
    } catch (err) {
      logger.warn('⚠️ Redis lookup error. Falling back to DB aggregation.', err);
    }

    const stats = await UserStats.find()
      .populate('userId', 'firstName lastName avatarUrl')
      .sort({ xp: -1 })
      .limit(limit);

    return stats.map((stat, index) => {
      const displayName = stat.userId
        ? `${(stat.userId as any).firstName ?? ''} ${(stat.userId as any).lastName ?? ''}`.trim()
        : '';
      return {
        rank: index + 1,
        userId: String(stat.userId ? (stat.userId as any)._id : stat._id),
        name: displayName || 'Student',
        avatarUrl: stat.userId ? (stat.userId as any).avatarUrl : undefined,
        level: stat.level ?? Math.floor(stat.xp / 1000) + 1,
        xp: stat.xp,
      };
    });
  }
}
export default LeaderboardService;
