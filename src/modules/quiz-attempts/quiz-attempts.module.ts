import { Module } from '@nestjs/common';
import { QuizModule } from '../quiz/quiz.module';
import { QuizAttemptsController } from './controllers/quiz-attempts.controller';
import { QuizAttemptsService } from './services/quiz-attempts.service';

/**
 * QuizAttemptsModule — luồng học viên làm quiz.
 * Import QuizModule để dùng QuizService (lấy quiz theo lesson).
 */
@Module({
  imports: [QuizModule],
  controllers: [QuizAttemptsController],
  providers: [QuizAttemptsService],
  exports: [QuizAttemptsService],
})
export class QuizAttemptsModule {}
