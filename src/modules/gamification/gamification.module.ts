import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GamificationController } from './controllers/gamification.controller';
import { GamificationService } from './services/gamification.service';
import { UserStatsSchema } from './models/user-stats.model';

@Module({
  imports: [MongooseModule.forFeature([{ name: 'UserStats', schema: UserStatsSchema }])],
  controllers: [GamificationController],
  providers:   [GamificationService],
  exports:     [GamificationService],
})
export class GamificationModule {}
