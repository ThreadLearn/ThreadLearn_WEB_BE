import {
  Body, Controller, Delete, Get, HttpCode,
  Param, Post, Put, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthenticatedUser } from '../../../common/api-handler';
import { ApiResponse } from '../../../common/api-response';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { QuizService } from '../services/quiz.service';   // ← THIẾU ở bản conflict, phải có
import { QuizAttemptsService } from '../../quiz-attempts/services/quiz-attempts.service';
import {
  createQuizSchema, quizSubmitSchema, CreateQuizDto,
  updateQuizSchema, UpdateQuizDto, addQuestionSchema, QuestionDto,
  updateQuestionSchema, UpdateQuestionDto,
} from '../schemas/quiz.schema';

@ApiTags('Quiz')
@Controller('v1/quiz')
@UseGuards(JwtAuthGuard)        // guard ở cấp class → không cần lặp ở mỗi method
@ApiBearerAuth('BearerAuth')
export class QuizController {
  constructor(
    private readonly quizService: QuizService,
    private readonly quizAttemptsService: QuizAttemptsService,
  ) {}

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

  // ─── UC39: Admin xóa câu hỏi ─────────────────────────────
  @Delete(':quizId/questions/:questionId')
  @HttpCode(200)
  @Roles('ADMIN')
  async deleteQuestion(
    @Param('quizId') quizId: string,
    @Param('questionId') questionId: string,
  ) {
    const quiz = await this.quizService.deleteQuestion(quizId, questionId);
    return ApiResponse.success({ message: 'Question deleted successfully.', data: quiz });
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

  // ─── Student: lấy quiz theo lesson (UC40) ────────────────
  @Get('lesson/:lessonId')
  async getQuizByLesson(@Param('lessonId') lessonId: string) {
    const quiz = await this.quizService.getQuizByLesson(lessonId);
    return ApiResponse.success({ message: 'Quiz fetched successfully.', data: quiz });
  }

  // ─── Student: submit quiz (UC40/41) ──────────────────────
  @Post('submit')
  @HttpCode(200)
  async submit(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(quizSubmitSchema)) body: { quizId: string; answers: Record<string, number>; startTime?: string },
  ) {
    const result = await this.quizAttemptsService.submitAttempt(user.id, body.quizId, body.answers, body.startTime);
    return ApiResponse.success({
      message: result.passed
        ? 'Congratulations! You passed the quiz successfully.'
        : `Attempt recorded. You did not reach the ${result.passingScorePercent}% passing threshold yet.`,
      data: result,
    });
  }

  // ─── Student: lấy lịch sử làm bài (UC43) ─────────────────
  @Get('attempts/me')
  async getMyAttempts(@CurrentUser() user: AuthenticatedUser) {
    const attempts = await this.quizAttemptsService.getMyAttempts(user.id);
    return ApiResponse.success({ message: 'Quiz attempts fetched successfully.', data: attempts });
  }

  // ─── Student: xem chi tiết 1 lượt làm bài (UC42) ──────────
  @Get('attempts/:attemptId')
  async getAttemptById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('attemptId') attemptId: string,
  ) {
    const attempt = await this.quizAttemptsService.getAttemptById(user.id, attemptId);
    return ApiResponse.success({ message: 'Quiz attempt details fetched successfully.', data: attempt });
  }
}