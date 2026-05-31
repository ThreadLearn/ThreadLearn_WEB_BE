import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IUserStats } from '../models/user-stats.model';
import { NotFoundError } from '../../../common/custom-error';

@Injectable()
export class GamificationService {
  constructor(@InjectModel('UserStats') private userStatsModel: Model<IUserStats>) {}

  /** Level formula: floor(xp / 1000) + 1 */
  async awardXP(userId: string, xpAmount: number) {
    const stats = await this.userStatsModel.findOne({ userId });
    if (!stats) throw new NotFoundError('User stats profile not found.');

    stats.xp += xpAmount;
    stats.level = Math.floor(stats.xp / 1000) + 1;
    stats.lastActiveDate = new Date();
    await stats.save();
    return stats;
  }

  /** Called on qualifying activity to track daily streak. */
  async updateStreak(userId: string) {
    const stats = await this.userStatsModel.findOne({ userId });
    if (!stats) return null;

    const now      = new Date();
    const diffDays = Math.floor((now.getTime() - new Date(stats.lastActiveDate).getTime()) / 86_400_000);

    if (diffDays === 1) {
      stats.currentStreak += 1;
      if (stats.currentStreak > stats.highestStreak) stats.highestStreak = stats.currentStreak;
    } else if (diffDays > 1) {
      stats.currentStreak = 1;
    }
    // diffDays === 0 → same day, no change

    stats.lastActiveDate = now;
    await stats.save();
    return stats;
  }

  async getStats(userId: string) {
    const stats = await this.userStatsModel.findOne({ userId });
    if (!stats) throw new NotFoundError('User stats profile not found.');
    return stats;
  }
}
