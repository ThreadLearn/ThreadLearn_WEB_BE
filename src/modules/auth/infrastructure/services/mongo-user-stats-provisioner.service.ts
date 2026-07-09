import { Injectable } from '@nestjs/common';
import { UserStats } from '../../../gamification/models/user-stats.model';
import { IUserStatsProvisioner } from '../../domain/interfaces/user-stats-provisioner.port';

/**
 * Adapter cho `IUserStatsProvisioner` — nơi DUY NHẤT (trong scope auth) chạm model
 * `UserStats` của gamification. Mirror legacy `AuthService` tạo
 * `UserStats { userId, xp:0, level:1 }` (các field khác dùng default schema:
 * currentStreak/highestStreak/quizzesCompleted/... = 0).
 *
 * Khác legacy `UserStats.create` (ném khi trùng `userId` unique): adapter dùng
 * **upsert idempotent** (`$setOnInsert`) để an toàn khi retry / user đã có stats —
 * KHÔNG tạo bản ghi trùng và KHÔNG ghi đè stats hiện có. KHÔNG log dữ liệu user.
 *
 * Phase DEV1.4B: tạo adapter + wire provider; CHƯA nằm trong request flow (controller
 * chưa migrate). Side-effect được gọi qua `UserRegisteredHandler` từ use-case.
 */
@Injectable()
export class MongoUserStatsProvisionerService implements IUserStatsProvisioner {
  async ensureForUser(userId: string): Promise<void> {
    await UserStats.updateOne(
      { userId },
      { $setOnInsert: { userId, xp: 0, level: 1 } },
      { upsert: true },
    );
  }
}
