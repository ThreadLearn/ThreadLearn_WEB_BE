import { UserStats } from '../models/user-stats.model';
import { NotFoundError } from '../../../common/custom-error';

export class GamificationService {
  /**
   * Awards XP to a user and recalculates their level.
   * Level formula: level = floor(xp / 1000) + 1
   */
  static async awardXP(userId: string, xpAmount: number) {
    const stats = await UserStats.findOne({ userId });
    if (!stats) {
      throw new NotFoundError('User stats profile not found.');
    }

    stats.xp += xpAmount;
    stats.level = Math.floor(stats.xp / 1000) + 1;
    stats.lastActiveDate = new Date();
    await stats.save();

    return stats;
  }

  /**
   * Updates daily login streak tracking.
   * Called when a user performs any qualifying activity (quiz pass, lesson view, etc.)
   */
  static async updateStreak(userId: string) {
    const stats = await UserStats.findOne({ userId });
    if (!stats) return;

    const now = new Date();
    const lastActive = new Date(stats.lastActiveDate);
    const diffDays = Math.floor(
      (now.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 1) {
      stats.currentStreak += 1;
      if (stats.currentStreak > stats.highestStreak) {
        stats.highestStreak = stats.currentStreak;
      }
    } else if (diffDays > 1) {
      stats.currentStreak = 1;
    }
    // diffDays === 0 means same day, no streak change

    stats.lastActiveDate = now;
    await stats.save();

    return stats;
  }

  /**
   * Returns the full gamification profile for a user.
   */
  static async getStats(userId: string) {
    const stats = await UserStats.findOne({ userId });
    if (!stats) {
      throw new NotFoundError('User stats profile not found.');
    }
    return stats;
  }
  async awardQuizCompletion(userId: string, xpReward: number) {
  // toàn bộ logic xp + streak + level + lastActiveDate ở đây
}
}
export default GamificationService;
