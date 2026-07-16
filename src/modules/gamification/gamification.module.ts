import { Module } from '@nestjs/common';
import { GamificationController } from './presentation/controller/gamification.controller';
import { AwardXpService } from './application/services/award-xp.service';
import { UpdateStreakService } from './application/services/update-streak.service';
import { GetStatsService } from './application/services/get-stats.service';
import { UserStatsRepository } from './infrastructure/persistence/repositories/mongo-user-stats.repository';
import { USER_STATS_REPOSITORY } from './domain/interfaces/user-stats.repository';
import { MongoStudentProgressAdapter } from './infrastructure/adapters/mongo-student-progress.adapter';
import { STUDENT_PROGRESS_PORT } from './domain/interfaces/student-progress.port';
import { GamificationRewardsEventHandler } from './application/event-handlers/gamification-rewards.event-handler';
import { GAMIFICATION_REALTIME_PORT } from './domain/interfaces/gamification-realtime.port';
import { SocketGamificationRealtimeAdapter } from './infrastructure/adapters/socket-gamification-realtime.adapter';

@Module({
  controllers: [GamificationController],
  providers: [
    AwardXpService,
    UpdateStreakService,
    GetStatsService,
    GamificationRewardsEventHandler,
    SocketGamificationRealtimeAdapter,
    {
      provide: USER_STATS_REPOSITORY,
      useClass: UserStatsRepository,
    },
    {
      provide: STUDENT_PROGRESS_PORT,
      useClass: MongoStudentProgressAdapter,
    },
    {
      provide: GAMIFICATION_REALTIME_PORT,
      useClass: SocketGamificationRealtimeAdapter,
    },
  ],
  exports: [
    USER_STATS_REPOSITORY,
  ],
})
export class GamificationModule {}
