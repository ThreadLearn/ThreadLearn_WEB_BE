import { Injectable } from '@nestjs/common';
import { UserStats } from '../../../gamification/models/user-stats.model';
import {
  IUserStatsReader,
  UserProfileStats,
} from '../../domain/interfaces/user-stats-reader.port';

/**
 * Adapter cho `IUserStatsReader` — nơi DUY NHẤT (scope users) chạm model `UserStats`
 * của gamification. Mirror ĐÚNG legacy `UsersService.getProfile`:
 * `const stats = await UserStats.findOne({ userId })` → trả khi có, `null` khi chưa có.
 *
 * - KHÔNG tự tạo stats (legacy GET không tạo — fallback `{xp:0,level:1,...}` do use-case
 *   DEV1.6C áp dụng giống `stats || fallback`). KHÔNG mutate stats.
 * - `.lean()` trả plain object gồm `_id`, `userId`, các stat field, timestamps, `__v` —
 *   parity JSON 1:1 với doc hydrated mà legacy đang trả (model không có toJSON transform).
 *
 * Phase DEV1.6B: tạo adapter chuẩn bị cho Get My Profile; CHƯA nằm trong request flow
 * (controller chưa migrate, provider chưa wire runtime).
 */
@Injectable()
export class MongoUserStatsReaderService implements IUserStatsReader {
  async getStatsByUserId(userId: string): Promise<UserProfileStats | null> {
    const stats = await UserStats.findOne({ userId }).lean();
    return stats ? (stats as unknown as UserProfileStats) : null;
  }
}
