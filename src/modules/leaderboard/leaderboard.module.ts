import { Module } from '@nestjs/common';
import { GamificationModule } from '../gamification/gamification.module';
import { LeaderboardController } from './presentation/controller/leaderboard.controller';
import { GetTopRankingsService } from './application/services/get-top-rankings.service';
import { GetMyRankService } from './application/services/get-my-rank.service';
import { LeaderboardCacheEventHandler } from './application/event-handlers/leaderboard-cache.event-handler';
import { RedisLeaderboardCacheAdapter } from './infrastructure/adapters/redis-leaderboard-cache.adapter';
import { LEADERBOARD_CACHE_PORT } from './domain/interfaces/leaderboard-cache.port';
import { MongoUserProfileAdapter } from './infrastructure/adapters/mongo-user-profile.adapter';
import { USER_PROFILE_PORT } from './domain/interfaces/user-profile.port';

@Module({
  imports: [GamificationModule],
  controllers: [LeaderboardController],
  providers: [
    GetTopRankingsService,
    GetMyRankService,
    LeaderboardCacheEventHandler,
    {
      provide: LEADERBOARD_CACHE_PORT,
      useClass: RedisLeaderboardCacheAdapter,
    },
    {
      provide: USER_PROFILE_PORT,
      useClass: MongoUserProfileAdapter,
    },
  ],
})
export class LeaderboardModule {}
