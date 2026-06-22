import { UserStats } from '../entities/user-stats.entity';

export interface IUserStatsRepository {
  findByUserId(userId: string): Promise<UserStats | null>;
  findOrCreate(userId: string): Promise<UserStats>;
  save(stats: UserStats): Promise<UserStats>;
}

export const USER_STATS_REPOSITORY = Symbol('USER_STATS_REPOSITORY');
