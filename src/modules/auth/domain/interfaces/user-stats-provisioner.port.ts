/**
 * PORT: khởi tạo bản ghi thống kê (UserStats / gamification) cho user mới.
 *
 * UserStats là concern của module gamification (cross-module). Auth use-case
 * KHÔNG được import model UserStats trực tiếp; thay vào đó gọi qua port này để
 * giữ tầng application sạch (side-effect đi qua port, hiện thực ở infrastructure).
 *
 * Audit DEV1.0: legacy `AuthService.register`/`createGoogleUser` tạo
 * `UserStats { userId, xp:0, level:1 }` ngay sau khi tạo user (các field còn lại
 * dùng default schema). Adapter phải mirror default đó.
 */
export interface IUserStatsProvisioner {
  /**
   * Đảm bảo user có bản ghi UserStats khởi tạo. Nên idempotent (an toàn khi retry)
   * để không tạo bản ghi trùng. KHÔNG log dữ liệu nhạy cảm của user.
   */
  ensureForUser(userId: string): Promise<void>;
}

/** DI token cho `IUserStatsProvisioner`. */
export const USER_STATS_PROVISIONER = Symbol('USER_STATS_PROVISIONER');
