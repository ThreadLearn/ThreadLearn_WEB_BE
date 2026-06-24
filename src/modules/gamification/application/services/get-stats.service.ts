import { Inject, Injectable } from '@nestjs/common';
import { COURSE_COMPLETION_XP, LESSON_COMPLETION_XP } from '../../constants';
import { IUserStatsRepository, USER_STATS_REPOSITORY } from '../../domain/interfaces/user-stats.repository';
import { IStudentProgressPort, STUDENT_PROGRESS_PORT } from '../../domain/interfaces/student-progress.port';

/**
 * UC49: View User Level (Student)
 * Service to fetch, synchronize and calculate user's level based on courses and lessons completed.
 */
@Injectable()
export class GetStatsService {
  constructor(
    @Inject(USER_STATS_REPOSITORY)
    private readonly userStatsRepository: IUserStatsRepository,
    @Inject(STUDENT_PROGRESS_PORT)
    private readonly studentProgressPort: IStudentProgressPort,
  ) {}

  async execute(userId: string) {
    const stats = await this.userStatsRepository.findOrCreate(userId);

    const completedLessonsCount = await this.studentProgressPort.getCompletedLessonsCount(userId);
    const completedCoursesCount = await this.studentProgressPort.getCompletedCoursesCount(userId);

    const changed = stats.syncProgress(
      completedLessonsCount,
      completedCoursesCount,
      LESSON_COMPLETION_XP,
      COURSE_COMPLETION_XP,
    );

    if (changed) {
      await this.userStatsRepository.save(stats);
    }

    return stats;
  }
}
