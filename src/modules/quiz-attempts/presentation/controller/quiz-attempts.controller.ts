import {
  Body, Controller, Get, HttpCode, Inject, Param, Post, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedUser } from '../../../../common/api-handler';
import { ApiResponse } from '../../../../common/api-response';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { ZodValidationPipe } from '../../../../common/pipes/zod-validation.pipe';
import { QuizAttemptsService } from '../../application/services/quiz-attempts.facade';
import { quizSubmitSchema, QuizSubmitDto } from '../validators/quiz-attempt.validator';
import { IQuizRepository, QUIZ_REPOSITORY } from '../../../quiz/domain/interfaces/quiz.repository';
import { DomainError, ErrorCode } from '../../../../shared/errors/error-codes';
import { QuizAttemptPresenter } from '../response/quiz-attempt.presenter';

@ApiTags('Quiz - Student')
@Controller('v1/quiz')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('BearerAuth')
export class QuizAttemptsController {
  constructor(
    private readonly quizAttemptsService: QuizAttemptsService,
    @Inject(QUIZ_REPOSITORY)
    private readonly quizRepository: IQuizRepository,
  ) {}

  // ─── UC40: Học viên lấy quiz theo lesson (ẩn đáp án) ──────
  @Get('lesson/:lessonId')
  async getQuizByLesson(@Param('lessonId') lessonId: string) {
    const quiz = await this.quizRepository.findByLessonId(lessonId);
    if (!quiz) {
      throw DomainError.notFound(ErrorCode.QUIZ_NOT_FOUND, 'Quiz not found for this lesson.');
    }
    return ApiResponse.success({ message: 'Quiz fetched successfully.', data: QuizAttemptPresenter.toStudentQuizResponse(quiz) });
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
      data: {
        attempt: QuizAttemptPresenter.toResponse(result.attempt),
        score: result.score,
        passed: result.passed,
        xpRewarded: result.xpRewarded,
        passingScorePercent: result.passingScorePercent,
        isTimeout: result.isTimeout,
      },
    });
  }

  // ─── UC43: Học viên xem lịch sử làm bài ──────────────────
  @Get('attempts/me')
  async getMyAttempts(@CurrentUser() user: AuthenticatedUser) {
    const attempts = await this.quizAttemptsService.getMyAttempts(user.id);
    return ApiResponse.success({ message: 'Quiz attempts fetched successfully.', data: QuizAttemptPresenter.toList(attempts) });
  }

  // ─── UC42: Học viên xem chi tiết 1 lượt làm bài ──────────
  @Get('attempts/:attemptId')
  async getAttemptById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('attemptId') attemptId: string,
  ) {
    const attempt = await this.quizAttemptsService.getAttemptById(user.id, attemptId);
    return ApiResponse.success({ message: 'Quiz attempt details fetched successfully.', data: QuizAttemptPresenter.toResponse(attempt) });
  }
}

