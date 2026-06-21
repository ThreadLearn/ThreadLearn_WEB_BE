import { Inject, Injectable } from '@nestjs/common';
import { Enrollment } from '../../../enrollments/models/enrollment.model';
import { COURSE_COMPLETION_XP, LESSON_COMPLETION_XP } from '../../constants';
import { IUserStatsRepository } from '../../domain/interfaces/user-stats.repository';

/**
 * UC49: View User Level (Student)
 * Service to fetch, synchronize and calculate user's level based on courses and lessons completed.
 */
@Injectable()
export class GetStatsService {
  constructor(
    @Inject('IUserStatsRepository')
    private readonly userStatsRepository: IUserStatsRepository,
  ) {}

  async execute(userId: string) {
    const stats = await this.userStatsRepository.findOrCreate(userId);

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
    if (changed) {
      await this.userStatsRepository.save(stats);
    }

    return stats;
  }
}
