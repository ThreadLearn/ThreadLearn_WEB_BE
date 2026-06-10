import { Body, Controller, Get, HttpCode, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { AuthenticatedUser } from '../../../common/api-handler';
import { ApiResponse } from '../../../common/api-response';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { QuizAttemptsService } from '../../quiz-attempts/services/quiz-attempts.service';
import { QuizService } from '../services/quiz.service';

const quizSubmitSchema = z.object({
  quizId: z.string().min(1, 'Quiz ID is required.'),
  answers: z.record(z.coerce.number()),
});

@ApiTags('Quiz')
@Controller('v1/quiz')
export class QuizController {
  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('BearerAuth')
  async getByLesson(@Query('lessonId') lessonId: string) {
    const quiz = await QuizService.getQuizByLesson(lessonId);
    return ApiResponse.success({ message: 'Quiz fetched successfully.', data: quiz });
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('BearerAuth')
  async getById(@Param('id') id: string) {
    const quiz = await QuizService.getQuizById(id);
    return ApiResponse.success({ message: 'Quiz fetched successfully.', data: quiz });
  }

  @Post('submit')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('BearerAuth')
  async submitAttempt(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(quizSubmitSchema))
    body: { quizId: string; answers: Record<string, number> }
  ) {
    const result = await QuizAttemptsService.submitAttempt(user.id, body.quizId, body.answers);
    return ApiResponse.success({
      message: result.passed
        ? 'Congratulations! You passed the quiz successfully.'
        : 'Attempt recorded. You did not reach the required passing score yet.',
      data: result,
    });
  }
}
