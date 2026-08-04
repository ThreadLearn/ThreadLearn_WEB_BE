import { Module } from '@nestjs/common';
import { LessonsModule } from '../lessons/lessons.module';
import { CourseModule } from '../course/course.module';
import { QuizController } from './presentation/controller/quiz.controller';
import { CreateQuizService } from './application/services/create-quiz.service';
import { UpdateQuizService } from './application/services/update-quiz.service';
import { GetQuizService } from './application/services/get-quiz.service';
import { DeleteQuizService } from './application/services/delete-quiz.service';
import { ListQuizzesService } from './application/services/list-quizzes.service';
import { AddQuestionService } from './application/services/add-question.service';
import { EditQuestionService } from './application/services/edit-question.service';
import { DeleteQuestionService } from './application/services/delete-question.service';
import { GetQuizByLessonService } from './application/services/get-quiz-by-lesson.service';
import { QuizBankService } from './application/services/quiz-bank.service';
import { MongoQuizRepository } from './infrastructure/persistence/mongo-quiz.repository';
import { QUIZ_REPOSITORY } from './domain/interfaces/quiz.repository';

/**
 * QuizModule — quản lý quiz & câu hỏi (Admin UC36–39 + Student quiz view).
 *
 * Export:
 * - QUIZ_REPOSITORY (PORT) — chuẩn cross-module
 */
@Module({
  imports: [LessonsModule, CourseModule], // inject LESSON_READ_PORT cho CreateQuizService
  controllers: [QuizController],
  providers: [
    // ── Infrastructure ──
    MongoQuizRepository,
    { provide: QUIZ_REPOSITORY, useExisting: MongoQuizRepository },
    // ── Application services (1 per UC) ──
    CreateQuizService,
    UpdateQuizService,
    GetQuizService,
    DeleteQuizService,
    ListQuizzesService,
    AddQuestionService,
    EditQuestionService,
    DeleteQuestionService,
    GetQuizByLessonService,
    QuizBankService,
  ],
  exports: [QUIZ_REPOSITORY], // PORT
})
export class QuizModule {}
