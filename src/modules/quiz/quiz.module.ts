import { Module } from '@nestjs/common';
import { QuizAttemptsModule } from '../quiz-attempts/quiz-attempts.module';
import { QuizController } from './controllers/quiz.controller';
import { QuizService } from './services/quiz.service';

@Module({
  imports: [QuizAttemptsModule],
  controllers: [QuizController],
  providers: [QuizService],
  exports: [QuizService],
})
export class QuizModule {}
