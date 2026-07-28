import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import {
  EVENT_PUBLISHER,
  EventSubscriber,
} from '../../../../shared/application/events/event-publisher.port';
import { NotificationsService } from '../../services/notifications.service';

interface QuizPassedEventPayload {
  userId: string;
  quizId: string;
  quizTitle: string;
  attemptId: string;
  score: number;
  xpReward: number;
}

@Injectable()
export class QuizPassedNotificationEventHandler implements OnModuleInit {
  constructor(
    @Inject(EVENT_PUBLISHER)
    private readonly eventBus: EventSubscriber,
  ) {}

  onModuleInit(): void {
    this.eventBus.subscribe<QuizPassedEventPayload>(
      'quiz.passed',
      this.onQuizPassed.bind(this),
    );
  }

  async onQuizPassed(event: QuizPassedEventPayload) {
    await NotificationsService.sendNotification({
      userId: event.userId,
      title: 'Quiz completed successfully',
      message: `You passed "${event.quizTitle}" with a score of ${event.score}% and earned ${event.xpReward} XP.`,
      type: 'QUIZ_PASSED',
      metadata: {
        quizId: event.quizId,
        attemptId: event.attemptId,
        score: event.score,
        xpReward: event.xpReward,
      },
    });
  }
}
