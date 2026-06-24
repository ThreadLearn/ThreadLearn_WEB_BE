import { UserStats } from '../../domain/entities/user-stats.entity';

export class UserStatsMapper {
  static toEntity(doc: any): UserStats {
    return UserStats.fromPersistence(
      {
        userId: doc.userId.toString(),
        xp: doc.xp,
        level: doc.level,
        currentStreak: doc.currentStreak,
        highestStreak: doc.highestStreak,
        quizzesCompleted: doc.quizzesCompleted,
        totalLessonsCompleted: doc.totalLessonsCompleted,
        coursesCompleted: doc.coursesCompleted,
        lastActiveDate: doc.lastActiveDate,
      },
      doc._id.toString(),
    );
  }

  static toPersistence(entity: UserStats): Record<string, any> {
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
