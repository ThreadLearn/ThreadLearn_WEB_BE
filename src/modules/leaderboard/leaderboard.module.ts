import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LeaderboardController } from './controllers/leaderboard.controller';
import { LeaderboardService } from './services/leaderboard.service';
import { UserStatsSchema } from '../gamification/models/user-stats.model';

@Module({
  imports: [MongooseModule.forFeature([{ name: 'UserStats', schema: UserStatsSchema }])],
  controllers: [LeaderboardController],
  providers:   [LeaderboardService],
  exports:     [LeaderboardService],
})
export class LeaderboardModule {}
