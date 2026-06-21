import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { AuthenticatedUser } from '../../../common/api-handler';
import { ApiResponse } from '../../../common/api-response';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { CodeExecutionService } from '../services/code-execution.service';

const runCodeSchema = z.object({
  sourceCode: z.string().min(1).max(50000),
  language: z.string().optional(),
  languageId: z.number().int().positive().optional(),
  stdin: z.string().max(10000).optional(),
  courseId: z.string().optional(),
  lessonId: z.string().optional(),
  exerciseId: z.string().optional(),
});

@ApiTags('Code Execution')
@Controller(['v1/code-execution', 'v1/code-executions'])
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('BearerAuth')
export class CodeExecutionController {
  constructor(private readonly codeExecution: CodeExecutionService) {}

  @Post('run')
  async run(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(runCodeSchema)) body: z.infer<typeof runCodeSchema>
  ) {
    const result = await this.codeExecution.executeCode(user.id, body, user.role);
    return ApiResponse.success({ message: 'Code executed successfully.', data: result });
  }

  @Get('history')
  async history(@CurrentUser() user: AuthenticatedUser, @Query('lessonId') lessonId?: string) {
    const result = await this.codeExecution.listHistory(user.id, lessonId);
    return ApiResponse.success({ message: 'Code execution history fetched.', data: result });
  }

  @Get(':id')
  async detail(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    const result = await this.codeExecution.getById(user.id, id);
    return ApiResponse.success({ message: 'Code execution fetched.', data: result });
  }
}
