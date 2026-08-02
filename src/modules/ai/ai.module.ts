import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { AIRetentionService } from './application/services/ai-retention.service';
import { GetHistoryByIdService } from './application/services/get-history-by-id.service';
import { GetHistoryLogsService } from './application/services/get-history-logs.service';
import { RequestRecommendationService } from './application/services/request-recommendation.service';
import { StreamRecommendationService } from './application/services/stream-recommendation.service';
import { UpdateFeedbackService } from './application/services/update-feedback.service';
import { AIAnalysisCacheService } from './application/services/ai-analysis-cache.service';
import { DailyQuotaService } from '../../shared/infrastructure/quota/daily-quota.service';
import { AI_HISTORY_REPOSITORY } from './domain/interfaces/ai-history.repository';
import { MongoAIHistoryRepository } from './infrastructure/persistence/mongo-ai-history.repository';
import { AIController } from './presentation/controller/ai.controller';

@Module({
  imports: [HttpModule],
  controllers: [AIController],
  providers: [
    MongoAIHistoryRepository,
    { provide: AI_HISTORY_REPOSITORY, useExisting: MongoAIHistoryRepository },
    RequestRecommendationService,
    StreamRecommendationService,
    GetHistoryLogsService,
    GetHistoryByIdService,
    UpdateFeedbackService,
    AIRetentionService,
    AIAnalysisCacheService,
    DailyQuotaService,
  ],
  exports: [AI_HISTORY_REPOSITORY, RequestRecommendationService],
})
export class AIModule {}
