import { Injectable } from '@nestjs/common';
import { UserStats as UserStatsModel } from '../schemas/user-stats.schema';
import { UserStats } from '../../../domain/entities/user-stats.entity';
import { IUserStatsRepository } from '../../../domain/interfaces/user-stats.repository';
import { UserStatsMapper } from '../../mapper/user-stats.mapper';

@Injectable()
export class UserStatsRepository implements IUserStatsRepository {
  async findByUserId(userId: string): Promise<UserStats | null> {
    const doc = await UserStatsModel.findOne({ userId }).exec();
    return doc ? UserStatsMapper.toEntity(doc) : null;
  }

  async findOrCreate(userId: string): Promise<UserStats> {
    const doc = await UserStatsModel.findOneAndUpdate(
      { userId },
      { $setOnInsert: { userId } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).exec();
    return UserStatsMapper.toEntity(doc);
  }

  async save(entity: UserStats): Promise<UserStats> {
    const data = UserStatsMapper.toPersistence(entity);
    const doc = await UserStatsModel.findOneAndUpdate(
      { userId: entity.userId },
      { $set: data },
      { new: true, upsert: true }
    ).exec();
    return UserStatsMapper.toEntity(doc);
  }

  async findTopByXp(limit: number): Promise<UserStats[]> {
    const docs = await UserStatsModel.find()
      .sort({ xp: -1 })
      .limit(limit)
      .exec();
    return docs.map((doc) => UserStatsMapper.toEntity(doc));
  }

  async findRankByUserId(userId: string): Promise<number | null> {
    const userDoc = await UserStatsModel.findOne({ userId }).select('xp').exec();
    if (!userDoc) return null;
    const higherCount = await UserStatsModel.countDocuments({ xp: { $gt: userDoc.xp } }).exec();
    return higherCount + 1;
  }
}
