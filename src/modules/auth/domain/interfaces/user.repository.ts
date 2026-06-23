import { UserEntity } from '../entities/user.entity';

/**
 * PORT: hợp đồng truy cập dữ liệu User (ngôn ngữ domain). Nhận/trả Entity,
 * KHÔNG biết Mongoose, KHÔNG trả document thô. Adapter (infrastructure) hiện thực.
 */
export interface IUserRepository {
  findById(id: string): Promise<UserEntity | null>;
  findByEmail(email: string): Promise<UserEntity | null>;
  /** Google ID còn tồn tại trong model hiện tại (sparse unique). */
  findByGoogleId(googleId: string): Promise<UserEntity | null>;
  create(entity: UserEntity): Promise<UserEntity>;
  update(entity: UserEntity): Promise<UserEntity>;
  updateLastLogin(userId: string, date: Date): Promise<void>;
}

/** DI token cho `IUserRepository`. */
export const USER_REPOSITORY = Symbol('USER_REPOSITORY');
