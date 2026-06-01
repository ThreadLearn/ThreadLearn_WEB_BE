import {
  Body, Controller, Delete, Get, HttpCode,
  Param, Post, Put, UseGuards
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../../common/api-handler';
import { ApiResponse } from '../../../common/api-response';
import { QuizService } from '../services/quiz.service';
import { QuizAttemptsService } from '../../quiz-attempts/services/quiz-attempts.service';
import { createQuizSchema, quizSubmitSchema, CreateQuizDto, updateQuizSchema, UpdateQuizDto } from '../schemas/quiz.schema';

@ApiTags('Quiz')
@Controller('v1/quiz')
export class QuizController {
  // constructor phải inject đủ
  constructor(
    private readonly quizService: QuizService,
    private readonly quizAttemptsService: QuizAttemptsService,
  ) { }
  // ✅ UC36 — Admin tạo quiz
  @Post()
  @HttpCode(201)
  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN')
  @ApiBearerAuth('BearerAuth')
  async createQuiz(
    @Body(new ZodValidationPipe(createQuizSchema)) dto: CreateQuizDto
  ) {
    const quiz = await this.quizService.createQuiz(dto);
    return ApiResponse.success({
      message: 'Quiz created successfully.',
      data: quiz,
    });
  }

  // ─── UC36-2: Admin cập nhật quiz ─────────────────────────
  @Put(':quizId')
  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN')
  @ApiBearerAuth('BearerAuth')
  async updateQuiz(
    @Param('quizId') quizId: string,
    @Body(new ZodValidationPipe(updateQuizSchema)) dto: UpdateQuizDto
  ) {
    const quiz = await this.quizService.updateQuiz(quizId, dto);
    return ApiResponse.success({
      message: 'Quiz updated successfully.',
      data: quiz,
    });
  }

  // ─── UC36-3: Admin xem chi tiết quiz ─────────────────────
  @Get(':quizId')
  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN')
  @ApiBearerAuth('BearerAuth')
  async getQuizById(@Param('quizId') quizId: string) {
    const quiz = await this.quizService.getQuizById(quizId);
    return ApiResponse.success({
      message: 'Quiz fetched successfully.',
      data: quiz,
    });
  }

  // ─── UC36-4: Admin xóa quiz ──────────────────────────────
  @Delete(':quizId')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN')
  @ApiBearerAuth('BearerAuth')
  async deleteQuiz(@Param('quizId') quizId: string) {
    await this.quizService.deleteQuiz(quizId);
    return ApiResponse.success({
      message: 'Quiz deleted successfully.',
      data: null,
    });
  }

  // ─── Student: lấy quiz theo lesson ───────────────────────
  @Get('lesson/:lessonId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('BearerAuth')
  async getQuizByLesson(@Param('lessonId') lessonId: string) {
    const quiz = await this.quizService.getQuizByLesson(lessonId);
    return ApiResponse.success({ data: quiz });
  }

  // ─── Student: submit quiz ─────────────────────────────────
  @Post('submit')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('BearerAuth')
  async submitAttempt(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(quizSubmitSchema))
    body: { quizId: string; answers: Record<string, number> }
  ) {
    const result = await this.quizAttemptsService.submitAttempt(
      user.id, body.quizId, body.answers
    );
    return ApiResponse.success({
      message: result.passed
        ? 'Congratulations! You passed the quiz successfully.'
        : `Attempt recorded. You did not reach the ${result.passingScorePercent}% passing threshold yet.`,
      data: result,
    });
  }
}
