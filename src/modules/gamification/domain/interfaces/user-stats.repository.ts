import { IUserStats } from '../../models/user-stats.model';

export interface IUserStatsRepository {
  findByUserId(userId: string): Promise<IUserStats | null>;
  findOrCreate(userId: string): Promise<IUserStats>;
  save(stats: IUserStats): Promise<IUserStats>;
}
