import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthenticatedUser } from '../../common/api-handler';
import { ApiResponse } from '../../common/api-response';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { UpdateLearningPlanDto, updateLearningPlanSchema } from './learning-plan.dto';
import { LearningPlansService } from './learning-plans.service';

@ApiTags('Learning plan')
@Controller('v1/learning-plan')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('BearerAuth')
export class LearningPlansController {
  constructor(private readonly learningPlans: LearningPlansService) {}

  @Get('me')
  async getMine(@CurrentUser() user: AuthenticatedUser) {
    return ApiResponse.success({ message: 'Learning plan fetched.', data: await this.learningPlans.getMine(user.id) });
  }

  @Put('me')
  async updateMine(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(updateLearningPlanSchema)) body: UpdateLearningPlanDto,
  ) {
    return ApiResponse.success({ message: 'Learning plan updated.', data: await this.learningPlans.updateMine(user.id, body) });
  }
}
