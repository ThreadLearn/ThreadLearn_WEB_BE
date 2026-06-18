import { Module } from '@nestjs/common';
import { QuizController } from './controllers/quiz.controller';
import { QuizService } from './services/quiz.service';

/**
 * QuizModule — quản lý quiz & câu hỏi (Admin).
 * Export QuizService để QuizAttemptsModule (luồng học viên) tái sử dụng.
 * Không import QuizAttemptsModule nữa → tránh phụ thuộc vòng.
 */
@Module({
  controllers: [QuizController],
  providers: [QuizService],
  exports: [QuizService],
})
export class QuizModule {}
