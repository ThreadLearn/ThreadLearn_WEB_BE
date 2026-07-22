import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  CompletionEffects,
  CourseCompletedEvent,
  ENROLLMENT_COMPLETION_EVENTS,
  LessonCompletedEvent,
} from './enrollment-completion.events';

@Injectable()
export class EnrollmentCompletionPublisher {
  constructor(private readonly events: EventEmitter2) {}

  async publishLessonCompleted(event: LessonCompletedEvent): Promise<CompletionEffects> {
    if (event.alreadyCompleted) return this.emptyEffects();

    const lessonEffects = this.mergeEffects(
      await this.events.emitAsync(ENROLLMENT_COMPLETION_EVENTS.lessonCompleted, event),
    );
    if (!event.courseCompleted) return lessonEffects;

    const courseEffects = await this.publishCourseCompleted({
      userId: event.userId,
      courseId: event.courseId,
      progressPercent: event.progressPercent,
      totalLessons: event.totalLessons,
      completedLessons: event.completedLessons,
    });

    return {
      xpRewarded: lessonEffects.xpRewarded + courseEffects.xpRewarded,
      stats: courseEffects.stats ?? lessonEffects.stats,
    };
  }

  async publishCourseCompleted(event: CourseCompletedEvent): Promise<CompletionEffects> {
    return this.mergeEffects(
      await this.events.emitAsync(ENROLLMENT_COMPLETION_EVENTS.courseCompleted, event),
    );
  }

  private mergeEffects(results: unknown[]): CompletionEffects {
    return results.reduce<CompletionEffects>((combined, result) => {
      if (!result || typeof result !== 'object') return combined;

      const effect = result as Partial<CompletionEffects>;
      return {
        xpRewarded:
          combined.xpRewarded +
          (typeof effect.xpRewarded === 'number' ? effect.xpRewarded : 0),
        stats: effect.stats ?? combined.stats,
      };
    }, this.emptyEffects());
  }

  private emptyEffects(): CompletionEffects {
    return { xpRewarded: 0, stats: null };
  }
}
