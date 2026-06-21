import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { AuthenticatedUser } from '../../../common/api-handler';
import { ApiResponse } from '../../../common/api-response';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { AIService } from '../services/ai.service';

const aiRecSchema = z.object({
  courseId: z.string().optional(),
  lessonId: z.string().optional(),
  codeExecutionId: z.string().optional(),
  inputCode: z.string().max(50000).optional(),
  language: z.string().optional(),
  prompt: z.string().max(4000).optional(),
});

const feedbackSchema = z.object({
  feedbackRating: z.number().int().min(1).max(5),
});

@ApiTags('AI')
@Controller('v1/ai')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('BearerAuth')
export class AIController {
  @Post('recommend')
  async recommend(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(aiRecSchema)) body: z.infer<typeof aiRecSchema>
  ) {
    const recommendation = await AIService.requestRecommendation(user.id, body);
    return ApiResponse.success({
      message: 'AI recommendation generated successfully.',
      data: recommendation,
    });
  }

  @Post('recommendation')
  async requestRecommendation(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(aiRecSchema)) body: z.infer<typeof aiRecSchema>
  ) {
    return this.recommend(user, body);
  }

  @Get('history')
  async history(@CurrentUser() user: AuthenticatedUser) {
    const histories = await AIService.getHistoryLogs(user.id);
    return ApiResponse.success({ message: 'AI history fetched successfully.', data: histories });
  }

  @Get('history/:id')
  async historyDetail(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    const history = await AIService.getHistoryById(user.id, id);
    return ApiResponse.success({ message: 'AI history fetched successfully.', data: history });
  }

  @Get('recommendation')
  async getHistoryLogs(@CurrentUser() user: AuthenticatedUser) {
    return this.history(user);
  }

  @Patch('history/:id/feedback')
  async feedback(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(feedbackSchema)) body: z.infer<typeof feedbackSchema>
  ) {
    const updated = await AIService.updateFeedback(user.id, id, body.feedbackRating);
    return ApiResponse.success({ message: 'AI feedback saved.', data: updated });
  }

  @Post('history/:id/feedback')
  async feedbackPost(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(feedbackSchema)) body: z.infer<typeof feedbackSchema>
  ) {
    return this.feedback(user, id, body);
  }
}
