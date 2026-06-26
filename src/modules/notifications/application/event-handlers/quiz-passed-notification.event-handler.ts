import { Injectable, OnModuleInit } from '@nestjs/common';
import { DomainEventPublisher } from '../../../../shared/application/events/domain-event.publisher';
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
  constructor(private readonly eventPublisher: DomainEventPublisher) {}

  onModuleInit() {
    this.eventPublisher.subscribe<QuizPassedEventPayload>('quiz.passed', async (event) => {
      await NotificationsService.sendNotification({
        userId: event.userId,
        title: 'Quiz Completed Successfully!',
        message: `You passed "${event.quizTitle}" with a score of ${event.score}% and earned ${event.xpReward} XP!`,
        type: 'QUIZ_PASSED',
        metadata: {
          quizId: event.quizId,
          attemptId: event.attemptId,
          score: event.score,
          xpReward: event.xpReward,
        },
      });
    });
  }
}
