import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AIAnalysisController } from './controllers/ai-analysis.controller';
import { AIAnalysisService } from './services/ai-analysis.service';
import { AIEngineService } from './services/ai-engine.service';
import { AIAnalysisSchema } from './models/ai-analysis.model';
import { UserSchema } from '../auth/models/user.model';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'AIAnalysis', schema: AIAnalysisSchema },
      { name: 'User',       schema: UserSchema },
    ]),
  ],
  controllers: [AIAnalysisController],
  providers:   [AIAnalysisService, AIEngineService],
  exports:     [AIAnalysisService],
})
export class AIAnalysisModule {}
