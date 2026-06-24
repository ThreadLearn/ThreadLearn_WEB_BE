import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { QuizPassedEvent } from '../../domain/events/quiz-passed.event';
import { NotificationsService } from '../../../notifications/services/notifications.service';

@Injectable()
export class NotificationEventHandler {
  @OnEvent('quiz.passed')
  async onQuizPassed(event: QuizPassedEvent) {
    await NotificationsService.sendNotification({
      userId: event.userId,
      title: 'Quiz Completed Successfully! 🎉',
      message: `You passed "${event.quizTitle}" with a score of ${event.score}% and earned ${event.xpReward} XP!`,
      type: 'ACHIEVEMENT',
    });
  }
}
