import { Module } from '@nestjs/common';
import { QuizController } from './controllers/quiz.controller';
import { QuizService } from './services/quiz.service';
import { QuizRepository } from './repositories/quiz.repository';
import { CreateQuizUseCase } from './use-cases/create-quiz.use-case';

/**
 * QuizModule — quản lý quiz & câu hỏi (Admin).
 * Export QuizService để QuizAttemptsModule (luồng học viên) tái sử dụng.
 * Không import QuizAttemptsModule nữa → tránh phụ thuộc vòng.
 */
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
