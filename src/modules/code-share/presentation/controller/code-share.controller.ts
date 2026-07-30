import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedUser } from '../../../../common/api-handler';
import { ApiResponse } from '../../../../common/api-response';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { ZodValidationPipe } from '../../../../common/pipes/zod-validation.pipe';
import { codeShareIdParamSchema, createCodeShareSchema, CreateCodeShareDto } from '../../application/dto/code-share.dto';
import { CodeShareService } from '../../application/services/code-share.service';

@ApiTags('Code shares')
@Controller('v1/code-shares')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('BearerAuth')
export class CodeShareController {
  constructor(private readonly codeShares: CodeShareService) {}

  @Post('from-execution')
  async create(@CurrentUser() user: AuthenticatedUser, @Body(new ZodValidationPipe(createCodeShareSchema)) body: CreateCodeShareDto) {
    const data = await this.codeShares.createFromExecution(user.id, user.role, body);
    return ApiResponse.success({ message: 'Code share created.', data, statusCode: 201 });
  }

  @Get(':id')
  async get(@CurrentUser() user: AuthenticatedUser, @Param('id', new ZodValidationPipe(codeShareIdParamSchema)) id: string) {
    const data = await this.codeShares.getVisible(user.id, user.role, id);
    return ApiResponse.success({ message: 'Code share fetched.', data });
  }
}
