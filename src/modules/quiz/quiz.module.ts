import { Module } from '@nestjs/common';
import { QuizController } from './controllers/quiz.controller';
import { QuizService } from './services/quiz.service';
import { QuizAttemptsModule } from '../quiz-attempts/quiz-attempts.module';

@Module({
  imports: [QuizAttemptsModule],
  controllers: [QuizController],
  providers: [QuizService],
  exports: [QuizService],
})
export class QuizModule {}

