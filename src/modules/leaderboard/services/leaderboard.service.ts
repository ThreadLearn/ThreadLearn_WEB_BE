import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Injectable()
export class LeaderboardService {
  private readonly logger = new Logger(LeaderboardService.name);

  constructor(
    @InjectModel('UserStats') private userStatsModel: Model<any>,
  ) {}

  async getTopRankings(limit = 50) {
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
        rank:      index + 1,
        userId:    stat.userId ? stat.userId._id : stat._id,
        displayName,
        avatarUrl: stat.userId?.avatarUrl,
        xp:        stat.xp,
        level:     stat.level,
      };
    });
  }

  async getMyRank(userId: string): Promise<{ rank: number; xp: number; level: number }> {
    const userStat = await this.userStatsModel.findOne({ userId }).lean<{ xp?: number; level?: number } | null>();
    if (!userStat) return { rank: 0, xp: 0, level: 1 };

    // Rank = 1 + (count of users with strictly higher XP)
    const higher = await this.userStatsModel.countDocuments({ xp: { $gt: userStat.xp ?? 0 } });
    return {
      rank:  higher + 1,
      xp:    userStat.xp    ?? 0,
      level: userStat.level ?? 1,
    };
  }
}
