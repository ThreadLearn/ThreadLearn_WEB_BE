import { Module } from '@nestjs/common';
import { QuizModule } from '../quiz/quiz.module';
import { GamificationModule } from '../gamification/gamification.module';
import { QuizAttemptsController } from './presentation/controller/quiz-attempts.controller';
import { QuizAttemptsService } from './application/services/quiz-attempts.facade';
import { SubmitAttemptService } from './application/services/submit-attempt.service';
import { GetAttemptService } from './application/services/get-attempt.service';
import { GetMyAttemptsService } from './application/services/get-my-attempts.service';
import { QuizGradingService } from './domain/services/quiz-grading.service';
import { DomainEventPublisher } from './application/events/domain-event.publisher';
import { NotificationEventHandler } from './application/event-handlers/notification.event-handler';
import { LeaderboardEventHandler } from './application/event-handlers/leaderboard.event-handler';
import { GamificationEventHandler } from './application/event-handlers/gamification.event-handler';
import { QuizAttemptRepository } from './infrastructure/persistence/repositories/mongo-quiz-attempt.repository';
import { QUIZ_ATTEMPT_REPOSITORY } from './domain/interfaces/quiz-attempt.repository';

/**
 * QuizAttemptsModule — luồng học viên làm quiz.
 */
@Module({
  imports: [
    QuizModule,
    GamificationModule,
  ],
  controllers: [QuizAttemptsController],
  providers: [
    QuizAttemptsService,
    SubmitAttemptService,
    GetAttemptService,
    GetMyAttemptsService,
    QuizGradingService,
    DomainEventPublisher,
    NotificationEventHandler,
    LeaderboardEventHandler,
    GamificationEventHandler,
    QuizAttemptRepository,
    {
      provide: QUIZ_ATTEMPT_REPOSITORY,
      useExisting: QuizAttemptRepository,
    },
  ],
  exports: [
    QuizAttemptsService,
    DomainEventPublisher,
  ],
})
export class QuizAttemptsModule {}
