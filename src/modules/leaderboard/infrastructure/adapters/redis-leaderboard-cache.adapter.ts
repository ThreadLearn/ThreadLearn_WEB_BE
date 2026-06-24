import { Injectable } from '@nestjs/common';
import { getRedisClient } from '../../../../configs/redis';
import { logger } from '../../../../configs/logger';
import { ILeaderboardCachePort, RankedEntry } from '../../domain/interfaces/leaderboard-cache.port';

@Injectable()
export class RedisLeaderboardCacheAdapter implements ILeaderboardCachePort {
  private readonly LEADERBOARD_KEY = 'leaderboard:xp';

  async getTopRankings(limit: number): Promise<RankedEntry[] | null> {
    try {
      const redis = getRedisClient();
      if (!redis.isOpen) return null;

      const range = await redis.zRangeWithScores(this.LEADERBOARD_KEY, 0, limit - 1, {
        REV: true,
      });

      if (range.length === 0) return null;

      return range.map((item, index) => {
        const parsed = JSON.parse(item.value);
        return {
          rank: index + 1,
          userId: String(parsed.userId ?? ''),
          name: parsed.name ?? 'Student',
          avatarUrl: parsed.avatarUrl,
          level: Number(parsed.level) || Math.floor(item.score / 1000) + 1,
          xp: Number(item.score) || 0,
        };
      });
    } catch (err) {
      logger.warn('⚠️ Redis lookup error. Falling back to DB aggregation.', err);
      return null;
    }
  }

  async syncRankings(entries: RankedEntry[]): Promise<void> {
    try {
      const redis = getRedisClient();
      if (!redis.isOpen) return;

      // Clear trước khi sync
      await redis.del(this.LEADERBOARD_KEY);

      for (const entry of entries) {
        await redis.zAdd(this.LEADERBOARD_KEY, {
          score: entry.xp,
          value: JSON.stringify({
            userId: entry.userId,
            name: entry.name,
            avatarUrl: entry.avatarUrl,
            level: entry.level,
          }),
        });
      }
      logger.info('📊 Leaderboard synchronized successfully with Redis.');
    } catch (err) {
      logger.warn('⚠️ Redis sync failed.', err);
    }
  }

  async invalidate(): Promise<void> {
    try {
      const redis = getRedisClient();
      if (redis.isOpen) await redis.del(this.LEADERBOARD_KEY);
    } catch (err) {
      logger.warn('Leaderboard cache invalidation failed.', err);
    }
  }
}
