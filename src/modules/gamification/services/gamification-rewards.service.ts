import { COURSE_COMPLETION_XP, LESSON_COMPLETION_XP } from '../constants';
import { UserStats } from '../models/user-stats.model';

export class GamificationRewardsService {
  static async awardLessonCompletion(userId: string, courseCompleted: boolean) {
    const xpRewarded = LESSON_COMPLETION_XP + (courseCompleted ? COURSE_COMPLETION_XP : 0);
    const stats = await UserStats.findOneAndUpdate(
      { userId },
      {
        $inc: {
          xp: xpRewarded,
          totalLessonsCompleted: 1,
          coursesCompleted: courseCompleted ? 1 : 0,
        },
        $set: { lastActiveDate: new Date() },
        $setOnInsert: { userId },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
    stats.level = Math.floor(stats.xp / 1000) + 1;
    if (stats.currentStreak < 1) stats.currentStreak = 1;
    if (stats.highestStreak < stats.currentStreak) {
      stats.highestStreak = stats.currentStreak;
    }
    await stats.save();
    return { xpRewarded, stats };
  }

  static async awardCourseCompletion(userId: string) {
    const xpRewarded = COURSE_COMPLETION_XP;
    const stats = await UserStats.findOneAndUpdate(
      { userId },
      {
        $inc: {
          xp: xpRewarded,
          coursesCompleted: 1,
        },
        $set: { lastActiveDate: new Date() },
        $setOnInsert: { userId },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
    stats.level = Math.floor(stats.xp / 1000) + 1;
    await stats.save();
    return { xpRewarded, stats };
  }
}

export default GamificationRewardsService;
