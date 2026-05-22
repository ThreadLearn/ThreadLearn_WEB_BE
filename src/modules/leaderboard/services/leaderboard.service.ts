import { getRedisClient } from '../../../configs/redis';
import { UserStats } from '../../gamification/models/user-stats.model';
import { logger } from '../../../configs/logger';

export class LeaderboardService {
  private static LEADERBOARD_KEY = 'leaderboard:xp';

  static async syncLeaderboardToRedis() {
    try {
      const redis = getRedisClient();
      if (!redis.isOpen) return;

      const stats = await UserStats.find().populate('userId', 'firstName lastName');
      for (const stat of stats) {
        if (stat.userId) {
          const displayName = `${(stat.userId as any).firstName} ${(stat.userId as any).lastName}`;
          await redis.zAdd(this.LEADERBOARD_KEY, {
            score: stat.xp,
            value: JSON.stringify({ userId: stat.userId._id, displayName }),
          });
        }
      }
      logger.info('📊 Leaderboard synchronized successfully with Redis.');
    } catch (err) {
      logger.warn('⚠️ Redis sync failed. Leaderboard will query DB directly.', err);
    }
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
              userId: parsed.userId,
              displayName: parsed.displayName,
              xp: item.score,
            };
          });
        }
      }
    } catch (err) {
      logger.warn('⚠️ Redis lookup error. Falling back to DB aggregation.', err);
    }

    const stats = await UserStats.find()
      .populate('userId', 'firstName lastName')
      .sort({ xp: -1 })
      .limit(limit);

    return stats.map((stat, index) => {
      const displayName = stat.userId
        ? `${(stat.userId as any).firstName} ${(stat.userId as any).lastName}`
        : 'Unknown User';
      return {
        rank: index + 1,
        userId: stat.userId ? stat.userId._id : stat._id,
        displayName,
        xp: stat.xp,
      };
    });
  }
}
export default LeaderboardService;
