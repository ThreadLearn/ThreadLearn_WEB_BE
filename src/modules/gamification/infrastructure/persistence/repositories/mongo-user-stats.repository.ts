import { Injectable } from '@nestjs/common';
import { IUserStats, UserStats } from '../../../models/user-stats.model';
import { IUserStatsRepository } from '../../../domain/interfaces/user-stats.repository';

@Injectable()
export class UserStatsRepository implements IUserStatsRepository {
  async findByUserId(userId: string): Promise<IUserStats | null> {
    return UserStats.findOne({ userId }).exec();
  }

  async findOrCreate(userId: string): Promise<IUserStats> {
    return UserStats.findOneAndUpdate(
      { userId },
      { $setOnInsert: { userId } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).exec() as any;
  }

  async save(stats: IUserStats): Promise<IUserStats> {
    return stats.save();
  }
}
