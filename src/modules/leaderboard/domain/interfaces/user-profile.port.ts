/**
 * Port để leaderboard lấy thông tin profile (name, avatar) của user
 * mà không phụ thuộc trực tiếp vào User model của module auth.
 */
export interface UserProfileDto {
  userId: string;
  name: string;
  avatarUrl?: string;
}

export interface IUserProfilePort {
  /** Lấy profile của nhiều user cùng lúc (batch lookup) */
  findByUserIds(userIds: string[]): Promise<UserProfileDto[]>;
}

export const USER_PROFILE_PORT = Symbol('USER_PROFILE_PORT');
