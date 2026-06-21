import { CertificatesHandler } from './certificates.handler';
import {
  CompletionEffects,
  CourseCompletedEvent,
  LessonCompletedEvent,
} from './enrollment-completion.events';
import { GamificationHandler } from './gamification.handler';
import { LeaderboardHandler } from './leaderboard.handler';
import { NotificationsHandler } from './notifications.handler';

export class EnrollmentCompletionPublisher {
  static async publishLessonCompleted(event: LessonCompletedEvent): Promise<CompletionEffects> {
    await CertificatesHandler.onLessonCompleted(event);
    await NotificationsHandler.onLessonCompleted(event);
    const effects = await GamificationHandler.onLessonCompleted(event);
    await LeaderboardHandler.onLessonCompleted(event);
    return effects;
  }

  static async publishCourseCompleted(event: CourseCompletedEvent): Promise<CompletionEffects> {
    await CertificatesHandler.onCourseCompleted(event);
    await NotificationsHandler.onCourseCompleted(event);
    const effects = await GamificationHandler.onCourseCompleted(event);
    await LeaderboardHandler.onCourseCompleted(event);
    return effects;
  }
}
