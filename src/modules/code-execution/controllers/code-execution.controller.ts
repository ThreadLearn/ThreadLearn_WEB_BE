import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CodeExecutionService } from '../services/code-execution.service';
import { RunCodeDto } from '../dto/code-execution.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../../../common/decorators/current-user.decorator';

@ApiTags('exercises')
@Controller('exercises')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('STUDENT', 'ADMIN')
@ApiBearerAuth()
export class ExercisesController {
  constructor(private readonly codeExecutionService: CodeExecutionService) {}

  @Get(':lessonId')
  async getExercise(@Param('lessonId') lessonId: string) {
    const data = await this.codeExecutionService.getExerciseByLesson(lessonId);
    return { message: 'Exercise fetched.', data };
  }
}

@ApiTags('code-execution')
@Controller('code-execution')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('STUDENT', 'ADMIN')
@ApiBearerAuth()
export class CodeExecutionController {
  constructor(private readonly codeExecutionService: CodeExecutionService) {}

  @Post('run')
  async run(@CurrentUser() user: JwtPayload, @Body() dto: RunCodeDto) {
    const data = await this.codeExecutionService.runAgainstExercise(
      user.id, dto.exerciseId, dto.code, dto.language,
    );
    return { message: 'Code executed.', data };
  }

  @Get('history')
  async history(
    @CurrentUser() user: JwtPayload,
    @Query('exerciseId') exerciseId: string,
    @Query('page')       page  = '1',
    @Query('limit')      limit = '10',
  ) {
    const result = await this.codeExecutionService.getHistory(
      user.id, exerciseId, parseInt(page, 10), parseInt(limit, 10),
    );
    return {
      message: 'History fetched.',
      data:    result.data,
      meta:    { total: result.total, page: result.page, limit: result.limit, hasMore: result.hasMore },
    };
  }
}
