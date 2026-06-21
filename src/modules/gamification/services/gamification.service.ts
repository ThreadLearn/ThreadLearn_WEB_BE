import { UserStats } from '../models/user-stats.model';
import { Enrollment } from '../../enrollments/models/enrollment.model';
import { NotFoundError } from '../../../common/custom-error';
import { COURSE_COMPLETION_XP, LESSON_COMPLETION_XP } from '../constants';

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
    const stats = await UserStats.findOneAndUpdate(
      { userId },
      { $setOnInsert: { userId } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    const enrollments = await Enrollment.find({ userId })
      .select('completedLessons completed')
      .lean();
    const completedLessonIds = new Set(
      enrollments.flatMap((enrollment) =>
        (enrollment.completedLessons ?? []).map((lessonId) => lessonId.toString())
      )
    );
    const completedCourses = enrollments.filter((enrollment) => enrollment.completed).length;
    const minimumXp =
      completedLessonIds.size * LESSON_COMPLETION_XP +
      completedCourses * COURSE_COMPLETION_XP;

    let changed = false;
    if ((stats.totalLessonsCompleted ?? 0) < completedLessonIds.size) {
      stats.totalLessonsCompleted = completedLessonIds.size;
      changed = true;
    }
    if ((stats.coursesCompleted ?? 0) < completedCourses) {
      stats.coursesCompleted = completedCourses;
      changed = true;
    }
    if (stats.xp < minimumXp) {
      stats.xp = minimumXp;
      changed = true;
    }
    if (completedLessonIds.size > 0 && stats.currentStreak < 1) {
      stats.currentStreak = 1;
      stats.highestStreak = Math.max(stats.highestStreak ?? 0, 1);
      changed = true;
    }
    const expectedLevel = Math.floor(stats.xp / 1000) + 1;
    if (stats.level !== expectedLevel) {
      stats.level = expectedLevel;
      changed = true;
    }
    if (changed) await stats.save();

    return stats;
  }
  async awardQuizCompletion(userId: string, xpReward: number) {
  // toàn bộ logic xp + streak + level + lastActiveDate ở đây
}
}
export default GamificationService;
