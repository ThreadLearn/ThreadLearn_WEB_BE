import { Module } from '@nestjs/common';
import { QuizController } from './controllers/quiz.controller';
import { QuizService } from './services/quiz.service';
import { QuizRepository } from './repositories/quiz.repository';
import { CreateQuizUseCase } from './use-cases/create-quiz.use-case';

@Module({
  controllers: [QuizController],
  providers: [
    QuizService,
    CreateQuizUseCase,
    {
      provide: 'IQuizRepository',
      useClass: QuizRepository,
    },
  ],
  exports: [QuizService],
})
export class QuizModule {}
