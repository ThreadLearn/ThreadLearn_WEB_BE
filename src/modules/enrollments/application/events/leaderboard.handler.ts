// TODO DEV2: Remove this file. Leaderboard module now uses its own @OnEvent handler.
// import { LeaderboardService } from '../../../leaderboard/services/leaderboard.service';
import { CourseCompletedEvent, LessonCompletedEvent } from './enrollment-completion.events';

export class LeaderboardHandler {
  static async onLessonCompleted(_event: LessonCompletedEvent): Promise<void> {
    // No-op: leaderboard module handles cache invalidation via @OnEvent('lesson.completed')
  }

  static async onCourseCompleted(_event: CourseCompletedEvent): Promise<void> {
    // No-op: leaderboard module handles cache invalidation via @OnEvent('course.completed')
  }
}
