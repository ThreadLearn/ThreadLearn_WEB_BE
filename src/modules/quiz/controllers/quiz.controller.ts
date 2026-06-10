import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthenticatedUser } from '../../../common/api-handler';
import { ApiResponse } from '../../../common/api-response';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { QuizAttemptsService } from '../../quiz-attempts/services/quiz-attempts.service';
import {
  CreateQuizDto,
  createQuizSchema,
  quizSubmitSchema,
  UpdateQuizDto,
  updateQuizSchema,
} from '../schemas/quiz.schema';
import { QuizService } from '../services/quiz.service';

@ApiTags('Quiz')
@Controller('v1/quiz')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('BearerAuth')
export class QuizController {
  constructor(
    private readonly quizService: QuizService,
    private readonly quizAttemptsService: QuizAttemptsService
  ) {}

  @Post()
  @HttpCode(201)
  @Roles('ADMIN')
  async createQuiz(@Body(new ZodValidationPipe(createQuizSchema)) dto: CreateQuizDto) {
    const quiz = await this.quizService.createQuiz(dto);
    return ApiResponse.success({ message: 'Quiz created successfully.', data: quiz, statusCode: 201 });
  }

  @Get()
  async getQuizByLessonQuery(@Query('lessonId') lessonId: string) {
    const quiz = await this.quizService.getQuizByLesson(lessonId);
    return ApiResponse.success({ message: 'Quiz fetched successfully.', data: quiz });
  }

  @Get('lesson/:lessonId')
  async getQuizByLesson(@Param('lessonId') lessonId: string) {
    const quiz = await this.quizService.getQuizByLesson(lessonId);
    return ApiResponse.success({ message: 'Quiz fetched successfully.', data: quiz });
  }

  @Post('submit')
  @HttpCode(200)
  async submit(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(quizSubmitSchema))
    body: { quizId: string; answers: Record<string, number> }
  ) {
    const result = await this.quizAttemptsService.submitAttempt(user.id, body.quizId, body.answers);
    return ApiResponse.success({
      message: result.passed
        ? 'Congratulations! You passed the quiz successfully.'
        : `Attempt recorded. You did not reach the ${result.passingScorePercent}% passing threshold yet.`,
      data: result,
    });
  }

  @Get(':quizId')
  @Roles('ADMIN')
  async getQuizById(@Param('quizId') quizId: string) {
    const quiz = await this.quizService.getQuizById(quizId);
    return ApiResponse.success({ message: 'Quiz fetched successfully.', data: quiz });
  }

  @Put(':quizId')
  @Roles('ADMIN')
  async updateQuiz(
    @Param('quizId') quizId: string,
    @Body(new ZodValidationPipe(updateQuizSchema)) dto: UpdateQuizDto
  ) {
    const quiz = await this.quizService.updateQuiz(quizId, dto);
    return ApiResponse.success({ message: 'Quiz updated successfully.', data: quiz });
  }

  @Delete(':quizId')
  @Roles('ADMIN')
  async deleteQuiz(@Param('quizId') quizId: string) {
    await this.quizService.deleteQuiz(quizId);
    return ApiResponse.success({ message: 'Quiz deleted successfully.', data: null });
  }
}
