import { GamificationRewardsService } from '../../../gamification/services/gamification-rewards.service';
import {
  CompletionEffects,
  CourseCompletedEvent,
  LessonCompletedEvent,
} from './enrollment-completion.events';

export class GamificationHandler {
  static async onLessonCompleted(event: LessonCompletedEvent): Promise<CompletionEffects> {
    if (event.alreadyCompleted) {
      return { xpRewarded: 0, stats: null };
    }
    return GamificationRewardsService.awardLessonCompletion(event.userId, event.courseCompleted);
  }

  static async onCourseCompleted(event: CourseCompletedEvent): Promise<CompletionEffects> {
    return GamificationRewardsService.awardCourseCompletion(event.userId);
  }
}
