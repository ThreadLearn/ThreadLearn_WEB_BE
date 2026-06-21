import {
  Body, Controller, Delete, Get, HttpCode,
  Param, Post, Put, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ApiResponse } from '../../../../common/api-response';
import { Roles } from '../../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { ZodValidationPipe } from '../../../../common/pipes/zod-validation.pipe';
import { QuizService } from '../../application/services/quiz.facade';
import {
  createQuizSchema, CreateQuizDto,
  updateQuizSchema, UpdateQuizDto,
  addQuestionSchema, QuestionDto,
  updateQuestionSchema, UpdateQuestionDto,
} from '../validators/quiz.validator';

/**
 * QuizController — luồng ADMIN quản lý quiz & câu hỏi (UC36–UC39).
 * Luồng học viên làm quiz nằm ở QuizAttemptsController.
 */
@ApiTags('Quiz - Admin')
@Controller('v1/quiz')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('BearerAuth')
export class QuizController {
  constructor(private readonly quizService: QuizService) { }

  // ─── UC36-1: Admin tạo quiz ──────────────────────────────
  @Post()
  @HttpCode(201)
  @Roles('ADMIN')
  async createQuiz(@Body(new ZodValidationPipe(createQuizSchema)) dto: CreateQuizDto) {
    const quiz = await this.quizService.createQuiz(dto);
    return ApiResponse.success({ message: 'Quiz created successfully.', data: quiz, statusCode: 201 });
  }

  // ─── UC36-5: Admin xem danh sách quiz ────────────────────
  @Get()
  @Roles('ADMIN')
  async listQuizzes() {
    const quizzes = await this.quizService.getAllQuizzes();
    return ApiResponse.success({ message: 'Quizzes fetched successfully.', data: quizzes });
  }

  // ─── UC37: Admin thêm câu hỏi ────────────────────────────
  @Post(':quizId/questions')
  @HttpCode(201)
  @Roles('ADMIN')
  async addQuestion(
    @Param('quizId') quizId: string,
    @Body(new ZodValidationPipe(addQuestionSchema)) question: QuestionDto,
  ) {
    const quiz = await this.quizService.addQuestion(quizId, question);
    return ApiResponse.success({ message: 'Question added successfully.', data: quiz });
  }

  // ─── UC38: Admin sửa câu hỏi ──────────────────────────────
  @Put(':quizId/questions/:questionId')
  @Roles('ADMIN')
  async editQuestion(
    @Param('quizId') quizId: string,
    @Param('questionId') questionId: string,
    @Body(new ZodValidationPipe(updateQuestionSchema)) dto: UpdateQuestionDto,
  ) {
    const quiz = await this.quizService.editQuestion(quizId, questionId, dto);
    return ApiResponse.success({ message: 'Question updated successfully.', data: quiz });
  }

  // ─── UC36-3: Admin xem chi tiết quiz ─────────────────────
  @Get(':quizId')
  @Roles('ADMIN')
  async getQuizById(@Param('quizId') quizId: string) {
    const quiz = await this.quizService.getQuizById(quizId);
    return ApiResponse.success({ message: 'Quiz fetched successfully.', data: quiz });
  }

  // ─── UC36-2: Admin cập nhật quiz ─────────────────────────
  @Put(':quizId')
  @Roles('ADMIN')
  async updateQuiz(
    @Param('quizId') quizId: string,
    @Body(new ZodValidationPipe(updateQuizSchema)) dto: UpdateQuizDto,
  ) {
    const quiz = await this.quizService.updateQuiz(quizId, dto);
    return ApiResponse.success({ message: 'Quiz updated successfully.', data: quiz });
  }

  // ─── UC36-4: Admin xóa quiz ──────────────────────────────
  @Delete(':quizId')
  @HttpCode(200)
  @Roles('ADMIN')
  async deleteQuiz(@Param('quizId') quizId: string) {
    await this.quizService.deleteQuiz(quizId);
    return ApiResponse.success({ message: 'Quiz deleted successfully.', data: null });
  }
}
