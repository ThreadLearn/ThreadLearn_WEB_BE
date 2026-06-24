import { Module } from '@nestjs/common';
import { QuizModule } from '../quiz/quiz.module';
import { QuizAttemptsController } from './presentation/controller/quiz-attempts.controller';
import { QuizAttemptsService } from './application/services/quiz-attempts.facade';
import { SubmitAttemptService } from './application/services/submit-attempt.service';
import { GetAttemptService } from './application/services/get-attempt.service';
import { GetMyAttemptsService } from './application/services/get-my-attempts.service';
import { QuizGradingService } from './domain/services/quiz-grading.service';
import { NotificationEventHandler } from './application/event-handlers/notification.event-handler';
import { QuizAttemptRepository } from './infrastructure/persistence/repositories/mongo-quiz-attempt.repository';
import { QUIZ_ATTEMPT_REPOSITORY } from './domain/interfaces/quiz-attempt.repository';

/**
 * QuizAttemptsModule — luồng học viên làm quiz.
 * Side-effect (XP/leaderboard/notification) phát qua EventEmitter2 (bus toàn cục),
 * các module sở hữu tự nghe bằng @OnEvent.
 */
@Module({
  imports: [
    QuizModule,
  ],
  controllers: [QuizAttemptsController],
  providers: [
    QuizAttemptsService,
    SubmitAttemptService,
    GetAttemptService,
    GetMyAttemptsService,
    QuizGradingService,
    NotificationEventHandler,
    QuizAttemptRepository,
    {
      provide: QUIZ_ATTEMPT_REPOSITORY,
      useExisting: QuizAttemptRepository,
    },
  ],
  exports: [
    QuizAttemptsService,
  ],
})
export class QuizAttemptsModule {}
