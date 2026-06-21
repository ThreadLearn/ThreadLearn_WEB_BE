import { Inject, Injectable } from '@nestjs/common';
import { Quiz } from '../../domain/entities/quiz.entity';
import { QUIZ_REPOSITORY, IQuizRepository } from '../../domain/interfaces/quiz.repository';
import { CreateQuizInput, UpdateQuizInput, QuestionInput, UpdateQuestionInput } from '../dto/quiz.dto';
import { CreateQuizService } from './create-quiz.service';
import { UpdateQuizService } from './update-quiz.service';
import { GetQuizService } from './get-quiz.service';
import { DeleteQuizService } from './delete-quiz.service';
import { ListQuizzesService } from './list-quizzes.service';
import { AddQuestionService } from './add-question.service';
import { EditQuestionService } from './edit-question.service';
import { DeleteQuestionService } from './delete-question.service';
import { GetQuizByLessonService } from './get-quiz-by-lesson.service';

/**
 * QuizService — facade mỏng delegate qua service per-UC.
 * GIỮ export cho quiz-attempts backward-compat (sẽ cắt dây ở B2).
 */
@Injectable()
export class QuizService {
  constructor(
    private readonly createQuizService: CreateQuizService,
    private readonly updateQuizService: UpdateQuizService,
    private readonly getQuizService: GetQuizService,
    private readonly deleteQuizService: DeleteQuizService,
    private readonly listQuizzesService: ListQuizzesService,
    private readonly addQuestionService: AddQuestionService,
    private readonly editQuestionService: EditQuestionService,
    private readonly deleteQuestionService: DeleteQuestionService,
    private readonly getQuizByLessonService: GetQuizByLessonService,
  ) {}

  // ─── UC36-1: Tạo quiz ──────────────────────────────────────
  async createQuiz(dto: CreateQuizInput): Promise<Quiz> {
    return this.createQuizService.execute(dto);
  }

  // ─── UC36-2: Cập nhật quiz ─────────────────────────────────
  async updateQuiz(quizId: string, dto: UpdateQuizInput): Promise<Quiz> {
    return this.updateQuizService.execute(quizId, dto);
  }

  // ─── UC36-3: Xem chi tiết quiz ─────────────────────────────
  async getQuizById(quizId: string): Promise<Quiz> {
    return this.getQuizService.execute(quizId);
  }

  // ─── UC36-4: Xóa quiz ──────────────────────────────────────
  async deleteQuiz(quizId: string): Promise<Quiz> {
    return this.deleteQuizService.execute(quizId);
  }

  // ─── UC36-5: Xem danh sách quiz ────────────────────────────
  async getAllQuizzes(): Promise<Quiz[]> {
    return this.listQuizzesService.execute();
  }

  // ─── UC37: Thêm câu hỏi ───────────────────────────────────
  async addQuestion(quizId: string, question: QuestionInput): Promise<Quiz> {
    return this.addQuestionService.execute(quizId, question);
  }

  // ─── UC38: Sửa câu hỏi ────────────────────────────────────
  async editQuestion(quizId: string, questionId: string, dto: UpdateQuestionInput): Promise<Quiz> {
    return this.editQuestionService.execute(quizId, questionId, dto);
  }

  // ─── UC39: Xóa câu hỏi ────────────────────────────────────
  async deleteQuestion(quizId: string, questionId: string): Promise<Quiz> {
    return this.deleteQuestionService.execute(quizId, questionId);
  }

  // ─── Student: Lấy quiz theo lesson ─────────────────────────
  async getQuizByLesson(lessonId: string): Promise<Quiz> {
    return this.getQuizByLessonService.execute(lessonId);
  }
}
