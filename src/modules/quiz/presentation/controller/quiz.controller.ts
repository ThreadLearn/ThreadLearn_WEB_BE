import {
  Body, Controller, Delete, Get, HttpCode,
  Param, Post, Put, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ApiResponse } from '../../../../common/api-response';
import { Roles } from '../../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { ZodValidationPipe } from '../../../../common/pipes/zod-validation.pipe';
import { CreateQuizService } from '../../application/services/create-quiz.service';
import { UpdateQuizService } from '../../application/services/update-quiz.service';
import { GetQuizService } from '../../application/services/get-quiz.service';
import { DeleteQuizService } from '../../application/services/delete-quiz.service';
import { ListQuizzesService } from '../../application/services/list-quizzes.service';
import { AddQuestionService } from '../../application/services/add-question.service';
import { EditQuestionService } from '../../application/services/edit-question.service';
import { DeleteQuestionService } from '../../application/services/delete-question.service';
import { GetQuizByLessonService } from '../../application/services/get-quiz-by-lesson.service';

import {
  createQuizSchema, CreateQuizDto,
  updateQuizSchema, UpdateQuizDto,
  addQuestionSchema, QuestionDto,
  updateQuestionSchema, UpdateQuestionDto,
} from '../validators/quiz.validator';
import { QuizPresenter } from '../response/quiz.presenter';

/**
 * QuizController — luồng ADMIN quản lý quiz & câu hỏi (UC36–UC39).
 * Luồng học viên làm quiz nằm ở QuizAttemptsController.
 */
@ApiTags('Quiz - Admin')
@Controller('v1/quiz')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('BearerAuth')
export class QuizController {
  constructor(
    private readonly createQuiz: CreateQuizService,
    private readonly updateQuiz: UpdateQuizService,
    private readonly getQuiz: GetQuizService,
    private readonly deleteQuiz: DeleteQuizService,
    private readonly listQuizzes: ListQuizzesService,
    private readonly addQuestion: AddQuestionService,
    private readonly editQuestion: EditQuestionService,
    private readonly deleteQuestion: DeleteQuestionService,
    private readonly getQuizByLesson: GetQuizByLessonService,
  ) { }

  // ─── UC36-1: Admin tạo quiz ──────────────────────────────
  @Post()
  @HttpCode(201)
  @Roles('ADMIN')
  async create(@Body(new ZodValidationPipe(createQuizSchema)) dto: CreateQuizDto) {
    const quiz = await this.createQuiz.execute(dto);
    return ApiResponse.success({ message: 'Quiz created successfully.', data: QuizPresenter.toResponse(quiz), statusCode: 201 });
  }

  // ─── UC36-5: Admin xem danh sách quiz ────────────────────
  @Get()
  @Roles('ADMIN')
  async list() {
    const quizzes = await this.listQuizzes.execute();
    return ApiResponse.success({ message: 'Quizzes fetched successfully.', data: QuizPresenter.toList(quizzes) });
  }

  // ─── UC37: Admin thêm câu hỏi ────────────────────────────
  @Post(':quizId/questions')
  @HttpCode(201)
  @Roles('ADMIN')
  async addQuestionToQuiz(
    @Param('quizId') quizId: string,
    @Body(new ZodValidationPipe(addQuestionSchema)) question: QuestionDto,
  ) {
    const quiz = await this.addQuestion.execute(quizId, question);
    return ApiResponse.success({ message: 'Question added successfully.', data: QuizPresenter.toResponse(quiz) });
  }

  // ─── UC38: Admin sửa câu hỏi ──────────────────────────────
  @Put(':quizId/questions/:questionId')
  @Roles('ADMIN')
  async editQuestionInQuiz(
    @Param('quizId') quizId: string,
    @Param('questionId') questionId: string,
    @Body(new ZodValidationPipe(updateQuestionSchema)) dto: UpdateQuestionDto,
  ) {
    const quiz = await this.editQuestion.execute(quizId, questionId, dto);
    return ApiResponse.success({ message: 'Question updated successfully.', data: QuizPresenter.toResponse(quiz) });
  }

  // ─── UC39: Admin xoá câu hỏi ──────────────────────────────
  @Delete(':quizId/questions/:questionId')
  @HttpCode(200)
  @Roles('ADMIN')
  async removeQuestionFromQuiz(
    @Param('quizId') quizId: string,
    @Param('questionId') questionId: string,
  ) {
    const quiz = await this.deleteQuestion.execute(quizId, questionId);
    return ApiResponse.success({ message: 'Question deleted successfully.', data: QuizPresenter.toResponse(quiz) });
  }

  // ─── UC36-3: Admin xem chi tiết quiz ─────────────────────
  @Get(':quizId')
  @Roles('ADMIN')
  async getById(@Param('quizId') quizId: string) {
    const quiz = await this.getQuiz.execute(quizId);
    return ApiResponse.success({ message: 'Quiz fetched successfully.', data: QuizPresenter.toResponse(quiz) });
  }

  // ─── UC36-2: Admin cập nhật quiz ─────────────────────────
  @Put(':quizId')
  @Roles('ADMIN')
  async update(
    @Param('quizId') quizId: string,
    @Body(new ZodValidationPipe(updateQuizSchema)) dto: UpdateQuizDto,
  ) {
    const quiz = await this.updateQuiz.execute(quizId, dto);
    return ApiResponse.success({ message: 'Quiz updated successfully.', data: QuizPresenter.toResponse(quiz) });
  }

  // ─── UC36-4: Admin xóa quiz ──────────────────────────────
  @Delete(':quizId')
  @HttpCode(200)
  @Roles('ADMIN')
  async remove(@Param('quizId') quizId: string) {
    await this.deleteQuiz.execute(quizId);
    return ApiResponse.success({ message: 'Quiz deleted successfully.', data: null });
  }
}
