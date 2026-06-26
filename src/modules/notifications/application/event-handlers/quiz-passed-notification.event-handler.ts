import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
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
export class QuizPassedNotificationEventHandler {
  @OnEvent('quiz.passed')
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
