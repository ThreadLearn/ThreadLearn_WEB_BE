import { Module } from '@nestjs/common';
import { QuizController } from './presentation/controller/quiz.controller';
import { QuizService } from './application/services/quiz.facade';
import { QuizRepository } from './infrastructure/persistence/repositories/mongo-quiz.repository';
import { CreateQuizService } from './application/services/create-quiz.service';
import { AddQuestionService } from './application/services/add-question.service';
import { EditQuestionService } from './application/services/edit-question.service';
import { DeleteQuestionService } from './application/services/delete-question.service';

/**
 * QuizModule — quản lý quiz & câu hỏi (Admin).
 * Export QuizService để QuizAttemptsModule (luồng học viên) tái sử dụng.
 * Không import QuizAttemptsModule nữa → tránh phụ thuộc vòng.
 */
@Module({
  controllers: [QuizController],
  providers: [
    QuizService,
    CreateQuizService,
    AddQuestionService,
    EditQuestionService,
    DeleteQuestionService,
    {
      provide: 'IQuizRepository',
      useClass: QuizRepository,
    },
  ],
  exports: [QuizService],
})
export class QuizModule {}
