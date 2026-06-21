import { Module } from '@nestjs/common';
import { GamificationController } from './presentation/controller/gamification.controller';
import { AwardXpService } from './application/services/award-xp.service';
import { UpdateStreakService } from './application/services/update-streak.service';
import { GetStatsService } from './application/services/get-stats.service';
import { UserStatsRepository } from './infrastructure/persistence/repositories/mongo-user-stats.repository';

@Module({
  controllers: [GamificationController],
  providers: [
    AwardXpService,
    UpdateStreakService,
    GetStatsService,
    {
      provide: 'IUserStatsRepository',
      useClass: UserStatsRepository,
    },
  ],
  exports: [
    AwardXpService,
    UpdateStreakService,
    GetStatsService,
  ],
})
export class GamificationModule {}
