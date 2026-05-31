import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LeaderboardService } from './services/leaderboard.service';
import { UserStatsSchema } from '../gamification/models/user-stats.model';

@Module({
  imports: [MongooseModule.forFeature([{ name: 'UserStats', schema: UserStatsSchema }])],
  providers: [LeaderboardService],
  exports: [LeaderboardService],
})
export class LeaderboardModule {}
