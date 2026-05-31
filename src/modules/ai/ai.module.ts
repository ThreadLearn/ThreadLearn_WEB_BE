import { Module } from '@nestjs/common';
import { AIController } from './controllers/ai.controller';
import { AIService } from './services/ai.service';

@Module({
  controllers: [AIController],
  providers: [AIService],
  exports: [AIService],
})
export class AIModule {}
