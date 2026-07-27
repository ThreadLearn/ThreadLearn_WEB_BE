import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthenticatedUser } from '../../../../common/api-handler';
import { ApiResponse } from '../../../../common/api-response';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { ZodValidationPipe } from '../../../../common/pipes/zod-validation.pipe';
import { RunCodePayload, runCodeSchema } from '../../application/dto/code-execution.dto';
import { CodeExecutionService } from '../../application/services/code-execution.service';

@ApiTags('Code Execution')
@Controller(['v1/code-execution', 'v1/code-executions'])
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('BearerAuth')
export class CodeExecutionController {
  constructor(private readonly codeExecution: CodeExecutionService) {}

  @Post('run')
  async run(@CurrentUser() user: AuthenticatedUser, @Body(new ZodValidationPipe(runCodeSchema)) body: RunCodePayload) {
    const result = await this.codeExecution.executeCode(user.id, body, user.role);
    return ApiResponse.success({ message: 'Code executed successfully.', data: result });
  }

  @Get('history')
  async history(
    @CurrentUser() user: AuthenticatedUser,
    @Query('lessonId') lessonId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.codeExecution.listHistory(user.id, lessonId, Number(page) || 1, Number(limit) || 20);
    return ApiResponse.success({ message: 'Code execution history fetched.', data: result });
  }

  @Get(':id')
  async detail(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    const result = await this.codeExecution.getById(user.id, id);
    return ApiResponse.success({ message: 'Code execution fetched.', data: result });
  }
}
