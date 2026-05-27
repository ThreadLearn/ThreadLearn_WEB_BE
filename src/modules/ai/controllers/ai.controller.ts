import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { AuthenticatedUser } from '../../../common/api-handler';
import { ApiResponse } from '../../../common/api-response';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { AIService } from '../services/ai.service';

const aiRecSchema = z.object({
  courseId: z.string().min(1, 'Course ID is required.'),
});

@ApiTags('AI')
@Controller('v1/ai/recommendation')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('BearerAuth')
export class AIController {
  @Post()
  async requestRecommendation(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(aiRecSchema)) body: { courseId: string }
  ) {
    const recommendation = await AIService.requestRecommendation(user.id, body.courseId);
    return ApiResponse.success({
      message: 'AI personalized study recommendations generated successfully.',
      data: recommendation,
    });
  }

  @Get()
  async getHistoryLogs(@CurrentUser() user: AuthenticatedUser) {
    const histories = await AIService.getHistoryLogs(user.id);
    return ApiResponse.success({
      message: 'AI interactive history logs fetched successfully.',
      data: histories,
    });
  }
}
