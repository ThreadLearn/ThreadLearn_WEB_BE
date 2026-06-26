import { Module } from '@nestjs/common';
import { QuizModule } from '../quiz/quiz.module';
import { QuizAttemptsController } from './presentation/controller/quiz-attempts.controller';
import { SubmitAttemptService } from './application/services/submit-attempt.service';
import { GetAttemptService } from './application/services/get-attempt.service';
import { GetMyAttemptsService } from './application/services/get-my-attempts.service';
import { GetStudentQuizByLessonService } from './application/services/get-student-quiz-by-lesson.service';
import { QuizGradingService } from './domain/services/quiz-grading.service';
import { QuizAttemptRepository } from './infrastructure/persistence/repositories/mongo-quiz-attempt.repository';
import { QUIZ_ATTEMPT_REPOSITORY } from './domain/interfaces/quiz-attempt.repository';
import { DomainEventPublisher } from './application/events/domain-event.publisher';

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
    SubmitAttemptService,
    GetAttemptService,
    GetMyAttemptsService,
    GetStudentQuizByLessonService,
    QuizGradingService,
    QuizAttemptRepository,
    DomainEventPublisher,
    {
      provide: QUIZ_ATTEMPT_REPOSITORY,
      useExisting: QuizAttemptRepository,
    },
  ],
})
export class QuizAttemptsModule {}
