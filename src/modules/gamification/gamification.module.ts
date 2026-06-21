import { Module } from '@nestjs/common';
import { GamificationController } from './presentation/controller/gamification.controller';
import { GamificationService } from './application/services/gamification.facade';
import { AwardXpService } from './application/services/award-xp.service';
import { UpdateStreakService } from './application/services/update-streak.service';
import { GetStatsService } from './application/services/get-stats.service';
import { UserStatsRepository } from './infrastructure/persistence/repositories/mongo-user-stats.repository';

@Module({
  controllers: [GamificationController],
  providers: [
    GamificationService,
    AwardXpService,
    UpdateStreakService,
    GetStatsService,
    {
      provide: 'IUserStatsRepository',
      useClass: UserStatsRepository,
    },
  ],
  exports: [GamificationService],
})
export class GamificationModule {}
