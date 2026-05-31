import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RedisService } from '../../../config/redis.service';

@Injectable()
export class LeaderboardService {
  private readonly logger = new Logger(LeaderboardService.name);
  private readonly LEADERBOARD_KEY = 'leaderboard:xp';

  constructor(
    @InjectModel('UserStats') private userStatsModel: Model<any>,
    private readonly redis: RedisService,
  ) {}

  async getTopRankings(limit = 10) {
    // Always query DB — Redis ZSET path adds complexity without strong upside at this scale.
    const stats = await this.userStatsModel
      .find()
      .populate('userId', 'firstName lastName avatarUrl')
      .sort({ xp: -1 })
      .limit(limit);

    return stats.map((stat: any, index: number) => {
      const displayName = stat.userId
        ? `${stat.userId.firstName ?? ''} ${stat.userId.lastName ?? ''}`.trim() || 'Anonymous'
        : 'Unknown User';
      return {
        rank:        index + 1,
        userId:      stat.userId ? stat.userId._id : stat._id,
        displayName,
        avatarUrl:   stat.userId?.avatarUrl,
        xp:          stat.xp,
        level:       stat.level,
      };
    });
  }
}
