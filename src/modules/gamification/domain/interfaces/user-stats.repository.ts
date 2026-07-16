import { UserStats } from '../entities/user-stats.entity';

export type XpAwardSourceType = 'quiz_attempt' | 'lesson_completion' | 'course_completion';

export interface IUserStatsRepository {
  findByUserId(userId: string): Promise<UserStats | null>;
  findOrCreate(userId: string): Promise<UserStats>;
  save(stats: UserStats): Promise<UserStats>;
  claimXpAward(sourceType: XpAwardSourceType, sourceId: string, userId: string): Promise<boolean>;

  /** Lấy danh sách top user theo XP giảm dần (cho leaderboard) */
  findTopByXp(limit: number): Promise<UserStats[]>;
  /** Tính rank của user (số user có XP cao hơn + 1). Trả null nếu user chưa có stats */
  findRankByUserId(userId: string): Promise<number | null>;
}

export const USER_STATS_REPOSITORY = Symbol('USER_STATS_REPOSITORY');
