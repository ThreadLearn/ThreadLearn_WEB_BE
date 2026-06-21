import { Injectable, OnModuleInit } from '@nestjs/common';
import { DomainEventPublisher } from '../../domain/events/domain-event.publisher';
import { QuizPassedEvent } from '../../domain/events/quiz-passed.event';
import { NotificationsService } from '../../../notifications/services/notifications.service';

@Injectable()
export class NotificationEventHandler implements OnModuleInit {
  constructor(
    private readonly eventPublisher: DomainEventPublisher,
  ) {}

  onModuleInit() {
    this.eventPublisher.subscribe('quiz.passed', async (event: QuizPassedEvent) => {
      await NotificationsService.sendNotification({
        userId: event.userId,
        title: 'Quiz Completed Successfully! 🎉',
        message: `You passed "${event.quizTitle}" with a score of ${event.score}% and earned ${event.xpReward} XP!`,
        type: 'ACHIEVEMENT',
      });
    });
  }
}
