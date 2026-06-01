import {
  Controller, Get, Post, Put, Delete,
  Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { QuizService } from '../services/quiz.service';
import { QuizAttemptsService } from '../../quiz-attempts/services/quiz-attempts.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../../../common/decorators/current-user.decorator';

interface SubmitDto {
  quizId:    string;
  startedAt?: string;
  answers:   { questionId: string; selectedOption: number }[];
}

@ApiTags('quiz')
@Controller('quiz')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class QuizController {
  constructor(
    private readonly quizService:    QuizService,
    private readonly attemptsService: QuizAttemptsService,
  ) {}

  // ── Public (auth-required) reads ────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'UC40 — get quiz by lessonId query.' })
  async byLesson(@Query('lessonId') lessonId: string) {
    const data = await this.quizService.getQuizByLesson(lessonId);
    return { message: 'Quiz fetched.', data };
  }

  @Get('attempts/me')
  @ApiOperation({ summary: 'UC43 — my quiz attempt history.' })
  async myAttempts(@CurrentUser() user: JwtPayload) {
    const data = await this.attemptsService.getMyAttempts(user.id);
    return { message: 'Attempts fetched.', data };
  }

  @Get(':id')
  @ApiOperation({ summary: 'UC40 — quiz by id.' })
  async byId(@Param('id') id: string) {
    const data = await this.quizService.getQuizById(id);
    return { message: 'Quiz fetched.', data };
  }

  // ── Student actions ─────────────────────────────────────────────────────────

  @Post('submit')
  @Roles('STUDENT', 'ADMIN')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'UC41 — submit quiz attempt for grading.' })
  async submit(@CurrentUser() user: JwtPayload, @Body() body: SubmitDto) {
    // BE service expects `Record<questionIndex, selectedOption>`.
    // FE sends `{ questionId, selectedOption }[]` so transform.
    const answersMap: Record<string, number> = {};
    body.answers.forEach((a, i) => { answersMap[String(i)] = a.selectedOption; });
    const data = await this.attemptsService.submitAttempt(user.id, body.quizId, answersMap);
    return { message: 'Quiz submitted.', data };
  }

  // ── Admin CRUD ──────────────────────────────────────────────────────────────

  @Post()
  @Roles('ADMIN')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'UC36 — create quiz (Admin).' })
  async create(@Body() body: any) {
    const data = await this.quizService.createQuiz(body);
    return { message: 'Quiz created.', data, statusCode: 201 };
  }

  @Put(':id')
  @Roles('ADMIN')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'UC37/UC38 — edit quiz / question (Admin).' })
  async update(@Param('id') id: string, @Body() body: any) {
    const data = await this.quizService.updateQuiz(id, body);
    return { message: 'Quiz updated.', data };
  }

  @Delete(':id')
  @Roles('ADMIN')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'UC39 — delete quiz / question (Admin).' })
  async remove(@Param('id') id: string) {
    await this.quizService.deleteQuiz(id);
    return { message: 'Quiz deleted.' };
  }
}
