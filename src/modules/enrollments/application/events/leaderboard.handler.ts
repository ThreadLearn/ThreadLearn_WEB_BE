import { LeaderboardService } from '../../../leaderboard/services/leaderboard.service';
import { CourseCompletedEvent, LessonCompletedEvent } from './enrollment-completion.events';

export class LeaderboardHandler {
  static async onLessonCompleted(event: LessonCompletedEvent): Promise<void> {
    if (event.alreadyCompleted) return;
    await LeaderboardService.invalidateCache();
  }

  static async onCourseCompleted(_event: CourseCompletedEvent): Promise<void> {
    await LeaderboardService.invalidateCache();
  }
}
