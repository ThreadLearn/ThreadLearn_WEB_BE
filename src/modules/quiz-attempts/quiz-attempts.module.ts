import { Module } from '@nestjs/common';
import { QuizModule } from '../quiz/quiz.module';
import { QuizAttemptsController } from './presentation/controller/quiz-attempts.controller';
import { SubmitAttemptService } from './application/services/submit-attempt.service';
import { GetAttemptService } from './application/services/get-attempt.service';
import { GetMyAttemptsService } from './application/services/get-my-attempts.service';
import { GetStudentQuizByLessonService } from './application/services/get-student-quiz-by-lesson.service';
import { QuizSessionService } from './application/services/quiz-session.service';
import { QuizGradingService } from './domain/services/quiz-grading.service';
import { QuizAttemptRepository } from './infrastructure/persistence/repositories/mongo-quiz-attempt.repository';
import { QUIZ_ATTEMPT_REPOSITORY } from './domain/interfaces/quiz-attempt.repository';
import { SharedEventsModule } from '../../shared/infrastructure/events/shared-events.module';
import { LearningAccessModule } from '../../shared/application/learning-access/learning-access.module';

/**
 * QuizAttemptsModule — luồng học viên làm quiz.
 * Side-effect (XP/leaderboard/notification) phát qua shared event bus,
 * các module sở hữu tự đăng ký listener.
 */
@Module({
  imports: [
    QuizModule,
    SharedEventsModule,
    LearningAccessModule,
  ],
  controllers: [QuizAttemptsController],
  providers: [
    SubmitAttemptService,
    GetAttemptService,
    GetMyAttemptsService,
    GetStudentQuizByLessonService,
    QuizSessionService,
    QuizGradingService,
    QuizAttemptRepository,
    {
      provide: QUIZ_ATTEMPT_REPOSITORY,
      useExisting: QuizAttemptRepository,
    },
  ],
})
export class QuizAttemptsModule {}
