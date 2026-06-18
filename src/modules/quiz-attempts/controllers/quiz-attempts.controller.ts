import {
  Body, Controller, Get, HttpCode, Param, Post, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedUser } from '../../../common/api-handler';
import { ApiResponse } from '../../../common/api-response';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { QuizService } from '../../quiz/services/quiz.service';
import { QuizAttemptsService } from '../services/quiz-attempts.service';
import { quizSubmitSchema, QuizSubmitDto } from '../validators/quiz-attempt.validator';

/**
 * QuizAttemptsController — luồng HỌC VIÊN làm quiz (UC40–UC43):
 * lấy quiz theo lesson, nộp bài, xem lịch sử & chi tiết lượt làm.
 *
 * Giữ prefix 'v1/quiz' (KHÔNG dùng 'v1/quiz-attempts') để URL không đổi,
 * tránh phá vỡ frontend đang tích hợp. Các route admin nằm ở QuizController.
 */
@ApiTags('Quiz - Student')
@Controller('v1/quiz')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('BearerAuth')
export class QuizAttemptsController {
  constructor(
    private readonly quizService: QuizService,
    private readonly quizAttemptsService: QuizAttemptsService,
  ) {}

  // ─── UC40: Học viên lấy quiz theo lesson (ẩn đáp án) ──────
  @Get('lesson/:lessonId')
  async getQuizByLesson(@Param('lessonId') lessonId: string) {
    const quiz = await this.quizService.getQuizByLesson(lessonId);
    return ApiResponse.success({ message: 'Quiz fetched successfully.', data: quiz });
  }

  // ─── UC40/41: Học viên nộp bài quiz ──────────────────────
  @Post('submit')
  @HttpCode(200)
  async submit(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(quizSubmitSchema)) body: QuizSubmitDto,
  ) {
    const result = await this.quizAttemptsService.submitAttempt(
      user.id, body.quizId, body.answers, body.startTime,
    );
    return ApiResponse.success({
      message: result.passed
        ? 'Congratulations! You passed the quiz successfully.'
        : `Attempt recorded. You did not reach the ${result.passingScorePercent}% passing threshold yet.`,
      data: result,
    });
  }

  // ─── UC43: Học viên xem lịch sử làm bài ──────────────────
  // (Khai báo TRƯỚC ':attemptId' để 'me' không bị nuốt vào param.)
  @Get('attempts/me')
  async getMyAttempts(@CurrentUser() user: AuthenticatedUser) {
    const attempts = await this.quizAttemptsService.getMyAttempts(user.id);
    return ApiResponse.success({ message: 'Quiz attempts fetched successfully.', data: attempts });
  }

  // ─── UC42: Học viên xem chi tiết 1 lượt làm bài ──────────
  @Get('attempts/:attemptId')
  async getAttemptById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('attemptId') attemptId: string,
  ) {
    const attempt = await this.quizAttemptsService.getAttemptById(user.id, attemptId);
    return ApiResponse.success({ message: 'Quiz attempt details fetched successfully.', data: attempt });
  }
}
