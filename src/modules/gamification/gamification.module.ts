import { Module } from '@nestjs/common';
import { GamificationController } from './controllers/gamification.controller';
import { GamificationService } from './services/gamification.service';

@Module({
  controllers: [GamificationController],
  providers: [GamificationService],
  exports: [GamificationService],
})
export class GamificationModule {}
