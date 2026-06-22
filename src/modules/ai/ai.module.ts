import { Module } from '@nestjs/common';
import { LearningAccessModule } from '../../shared/application/learning-access/learning-access.module';
import { AIRetentionService } from './application/services/ai-retention.service';
import { GetHistoryByIdService } from './application/services/get-history-by-id.service';
import { GetHistoryLogsService } from './application/services/get-history-logs.service';
import { RequestRecommendationService } from './application/services/request-recommendation.service';
import { UpdateFeedbackService } from './application/services/update-feedback.service';
import { AI_HISTORY_REPOSITORY } from './domain/interfaces/ai-history.repository';
import { MongoAIHistoryRepository } from './infrastructure/persistence/mongo-ai-history.repository';
import { AIController } from './presentation/controller/ai.controller';

@Module({
  imports: [LearningAccessModule],
  controllers: [AIController],
  providers: [
    MongoAIHistoryRepository,
    { provide: AI_HISTORY_REPOSITORY, useExisting: MongoAIHistoryRepository },
    RequestRecommendationService,
    GetHistoryLogsService,
    GetHistoryByIdService,
    UpdateFeedbackService,
    AIRetentionService,
  ],
  exports: [AI_HISTORY_REPOSITORY],
})
export class AIModule {}
