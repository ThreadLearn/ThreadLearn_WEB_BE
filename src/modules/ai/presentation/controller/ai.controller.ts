import { Body, Controller, Get, Param, Patch, Post, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { AuthenticatedUser } from '../../../../common/api-handler';
import { ApiResponse } from '../../../../common/api-response';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { ZodValidationPipe } from '../../../../common/pipes/zod-validation.pipe';
import {
  AIRecommendationPayload,
  FeedbackDto,
  aiRecommendationSchema,
  feedbackSchema,
} from '../../application/dto/ai.dto';
import { GetHistoryByIdService } from '../../application/services/get-history-by-id.service';
import { GetHistoryLogsService } from '../../application/services/get-history-logs.service';
import { RequestRecommendationService } from '../../application/services/request-recommendation.service';
import { StreamRecommendationService } from '../../application/services/stream-recommendation.service';
import { UpdateFeedbackService } from '../../application/services/update-feedback.service';

@ApiTags('AI')
@Controller('v1/ai')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('BearerAuth')
export class AIController {
  constructor(
    private readonly requestRecommendationSvc: RequestRecommendationService,
    private readonly streamRecommendationSvc: StreamRecommendationService,
    private readonly getHistoryLogsSvc: GetHistoryLogsService,
    private readonly getHistoryByIdSvc: GetHistoryByIdService,
    private readonly updateFeedbackSvc: UpdateFeedbackService,
  ) {}

  @Post('recommend')
  async recommend(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(aiRecommendationSchema)) body: AIRecommendationPayload,
  ) {
    const recommendation = await this.requestRecommendationSvc.execute(user.id, body);
    return ApiResponse.success({
      message: 'AI recommendation generated successfully.',
      data: recommendation,
    });
  }

  @Post('recommendation')
  async requestRecommendation(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(aiRecommendationSchema)) body: AIRecommendationPayload,
  ) {
    return this.recommend(user, body);
  }

  @Post('analyze/stream')
  async analyzeStream(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(aiRecommendationSchema)) body: AIRecommendationPayload,
    @Res() res: Response,
  ) {
    await this.streamRecommendationSvc.execute(user.id, body, res);
  }

  @Get('history')
  async history(@CurrentUser() user: AuthenticatedUser, @Query('page') page?: string, @Query('limit') limit?: string) {
    const histories = await this.getHistoryLogsSvc.execute(user.id, Number(page) || 1, Number(limit) || 20);
    return ApiResponse.success({ message: 'AI history fetched successfully.', data: histories });
  }

  @Get('history/:id')
  async historyDetail(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    const history = await this.getHistoryByIdSvc.execute(user.id, id);
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
    @Body(new ZodValidationPipe(feedbackSchema)) body: FeedbackDto,
  ) {
    const updated = await this.updateFeedbackSvc.execute(user.id, id, body.feedbackRating);
    return ApiResponse.success({ message: 'AI feedback saved.', data: updated });
  }

  @Post('history/:id/feedback')
  async feedbackPost(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(feedbackSchema)) body: FeedbackDto,
  ) {
    return this.feedback(user, id, body);
  }
}
