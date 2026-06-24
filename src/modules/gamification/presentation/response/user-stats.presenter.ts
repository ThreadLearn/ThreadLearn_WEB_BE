import { UserStats } from '../../domain/entities/user-stats.entity';

export class UserStatsPresenter {
  static toResponse(entity: UserStats) {
    const props = entity.toProps();
    return {
      userId: props.userId,
      xp: props.xp,
      level: props.level,
      currentStreak: props.currentStreak,
      highestStreak: props.highestStreak,
      quizzesCompleted: props.quizzesCompleted,
      totalLessonsCompleted: props.totalLessonsCompleted,
      coursesCompleted: props.coursesCompleted,
      lastActiveDate: props.lastActiveDate,
    };
  }
}
