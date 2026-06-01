import {
  Body, Controller, Get, HttpCode,
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
import { createQuizSchema, quizSubmitSchema, CreateQuizDto } from '../schemas/quiz.schema';

@ApiTags('Quiz')
@Controller('v1/quiz')
export class QuizController {
  constructor() {}

  // ✅ UC36 — Admin tạo quiz
  @Post()
  @HttpCode(201)
  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN')
  @ApiBearerAuth('BearerAuth')
  async createQuiz(
    @Body(new ZodValidationPipe(createQuizSchema)) dto: CreateQuizDto
  ) {
    const quiz = await QuizService.createQuiz(dto);
    return ApiResponse.success({
      message: 'Quiz created successfully.',
      data: quiz,
    });
  }

  // ✅ UC36 — Admin cập nhật quiz
  @Put(':quizId')
  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN')
  @ApiBearerAuth('BearerAuth')
  async updateQuiz(
    @Param('quizId') quizId: string,
    @Body(new ZodValidationPipe(createQuizSchema.partial())) dto: Partial<CreateQuizDto>
  ) {
    const quiz = await QuizService.updateQuiz(quizId, dto);
    return ApiResponse.success({ 
      message: 'Quiz updated successfully.', 
      data: quiz 
    });
  }

  // ✅ User lấy quiz theo lesson
  @Get('lesson/:lessonId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('BearerAuth')
  async getQuizByLesson(@Param('lessonId') lessonId: string) {
    const quiz = await QuizService.getQuizByLesson(lessonId);
    return ApiResponse.success({ data: quiz });
  }

  // ✅ User submit quiz
  @Post('submit')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('BearerAuth')
  async submitAttempt(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(quizSubmitSchema))
    body: { quizId: string; answers: Record<string, number> }
  ) {
    const result = await QuizAttemptsService.submitAttempt(
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
