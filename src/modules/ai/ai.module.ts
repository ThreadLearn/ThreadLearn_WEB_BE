import { Module } from '@nestjs/common';
import { AIController } from './controllers/ai.controller';
import { AIService } from './services/ai.service';
import { AIRetentionService } from './services/ai-retention.service';

@Module({
  controllers: [AIController],
  providers: [AIService, AIRetentionService],
  exports: [AIService],
})
export class AIModule {}
