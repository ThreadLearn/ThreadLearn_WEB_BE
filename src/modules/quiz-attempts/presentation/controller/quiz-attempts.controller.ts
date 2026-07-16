import {
  Body, Controller, Get, HttpCode, Param, Post, Query, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedUser } from '../../../../common/api-handler';
import { ApiResponse } from '../../../../common/api-response';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { ZodValidationPipe } from '../../../../common/pipes/zod-validation.pipe';
import { SubmitAttemptService } from '../../application/services/submit-attempt.service';
import { GetAttemptService } from '../../application/services/get-attempt.service';
import { GetMyAttemptsService } from '../../application/services/get-my-attempts.service';
import { GetStudentQuizByLessonService } from '../../application/services/get-student-quiz-by-lesson.service';
import {
  quizAttemptHistoryQuerySchema,
  QuizAttemptHistoryQueryDto,
  quizSubmitSchema,
  QuizSubmitDto,
} from '../validators/quiz-attempt.validator';
import { QuizAttemptPresenter } from '../response/quiz-attempt.presenter';

@ApiTags('Quiz - Student')
@Controller('v1/quiz')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('BearerAuth')
export class QuizAttemptsController {
  constructor(
    private readonly submitAttemptService: SubmitAttemptService,
    private readonly getAttemptService: GetAttemptService,
    private readonly getMyAttemptsService: GetMyAttemptsService,
    private readonly getStudentQuizByLessonService: GetStudentQuizByLessonService,
  ) { }

  // ─── UC40: Học viên lấy quiz theo lesson (ẩn đáp án) ──────
  @Get('lesson/:lessonId')
  async getQuizByLesson(@Param('lessonId') lessonId: string) {
    const quiz = await this.getStudentQuizByLessonService.execute(lessonId);
    return ApiResponse.success({ message: 'Quiz fetched successfully.', data: QuizAttemptPresenter.toStudentQuizResponse(quiz) });
  }

  // ─── UC40/41: Học viên nộp bài quiz ──────────────────────
  @Post('submit')
  @HttpCode(200)
  async submit(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(quizSubmitSchema)) body: QuizSubmitDto,
  ) {
    const result = await this.submitAttemptService.execute(
      user.id, body.quizId, body.answers, body.startTime,
    );

    return ApiResponse.success({
      message: result.passed
        ? 'Congratulations! You passed the quiz successfully.'
        : `Attempt recorded. You did not reach the ${result.passingScorePercent}% passing threshold yet.`,
      data: QuizAttemptPresenter.toSubmitResult(result),
    });
  }

  // ─── UC43: Học viên xem lịch sử làm bài ──────────────────
  @Get('attempts/me')
  async getMyAttempts(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(quizAttemptHistoryQuerySchema)) query: QuizAttemptHistoryQueryDto,
  ) {
    const result = await this.getMyAttemptsService.execute(user.id, query);
    if (Array.isArray(result)) {
      return ApiResponse.success({
        message: 'Quiz attempts fetched successfully.',
        data: QuizAttemptPresenter.toList(result),
      });
    }

    return ApiResponse.success({
      message: 'Quiz attempts fetched successfully.',
      data: QuizAttemptPresenter.toList(result.items),
      meta: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    });
  }

  // ─── UC42: Học viên xem chi tiết 1 lượt làm bài ──────────
  @Get('attempts/:attemptId')
  async getAttemptById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('attemptId') attemptId: string,
  ) {
    const attempt = await this.getAttemptService.execute(user.id, attemptId);
    return ApiResponse.success({ message: 'Quiz attempt details fetched successfully.', data: QuizAttemptPresenter.toResponse(attempt) });
  }
}

