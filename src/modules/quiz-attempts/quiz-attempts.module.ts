import { Module } from '@nestjs/common';
import { QuizModule } from '../quiz/quiz.module';
import { QuizAttemptsController } from './presentation/controller/quiz-attempts.controller';
import { QuizAttemptsService } from './application/services/quiz-attempts.facade';
import { SubmitAttemptService } from './application/services/submit-attempt.service';
import { GetAttemptService } from './application/services/get-attempt.service';
import { GetMyAttemptsService } from './application/services/get-my-attempts.service';
import { QuizAttemptRepository } from './infrastructure/persistence/repositories/mongo-quiz-attempt.repository';

/**
 * QuizAttemptsModule — luồng học viên làm quiz.
 * Import QuizModule để dùng QuizService (lấy quiz theo lesson).
 */
@Module({
  imports: [QuizModule],
  controllers: [QuizAttemptsController],
  providers: [
    QuizAttemptsService,
    SubmitAttemptService,
    GetAttemptService,
    GetMyAttemptsService,
    {
      provide: 'IQuizAttemptRepository',
      useClass: QuizAttemptRepository,
    },
  ],
  exports: [QuizAttemptsService],
})
export class QuizAttemptsModule {}
