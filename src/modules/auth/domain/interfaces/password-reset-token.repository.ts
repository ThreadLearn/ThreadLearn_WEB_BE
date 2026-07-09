import { PasswordResetTokenEntity } from '../entities/password-reset-token.entity';

/**
 * PORT: hợp đồng truy cập Password Reset Token (lưu tokenHash).
 */
export interface IPasswordResetTokenRepository {
  findByTokenHash(tokenHash: string): Promise<PasswordResetTokenEntity | null>;
  create(entity: PasswordResetTokenEntity): Promise<PasswordResetTokenEntity>;
  update(entity: PasswordResetTokenEntity): Promise<PasswordResetTokenEntity>;
  invalidateUnusedByUserId(userId: string): Promise<void>;
}

/** DI token cho `IPasswordResetTokenRepository`. */
export const PASSWORD_RESET_TOKEN_REPOSITORY = Symbol('PASSWORD_RESET_TOKEN_REPOSITORY');
