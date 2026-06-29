/**
 * PORT (optional, chuẩn bị cho Get My Profile ở DEV1.6C): đọc UserStats cho
 * response GET `/api/v1/users/profile`. Type thuần domain — KHÔNG import Mongoose/
 * UserStats model/infrastructure. Adapter (`MongoUserStatsReaderService`) hiện thực.
 *
 * Mục tiêu: tách UserStats (concern gamification) ra khỏi `UsersService` legacy mà
 * KHÔNG đổi response. Reader trả stats khi có, hoặc `null` khi chưa có — fallback
 * `{ xp:0, level:1, currentStreak:0, highestStreak:0 }` do use-case DEV1.6C áp dụng
 * (mirror đúng `stats || fallback` legacy).
 */

/**
 * Stats trả ở GET profile. Mirror tập field UserStats hiện tại; index signature cho
 * phép các field persist khác (vd `_id`, `userId`, timestamps, `__v`) đi qua nguyên
 * vẹn để giữ JSON parity 1:1 với legacy — KHÔNG kéo type Mongoose vào domain.
 */
export interface UserProfileStats {
  xp: number;
  level: number;
  currentStreak: number;
  highestStreak: number;
  quizzesCompleted?: number;
  coursesCompleted?: number;
  totalLessonsCompleted?: number;
  lastActiveDate?: Date;
  [key: string]: unknown;
}

export interface IUserStatsReader {
  /** Đọc stats theo userId. Trả `null` nếu chưa có (KHÔNG tự tạo — mirror legacy GET). */
  getStatsByUserId(userId: string): Promise<UserProfileStats | null>;
}

/** DI token cho `IUserStatsReader`. */
export const USER_STATS_READER = Symbol('USER_STATS_READER');
