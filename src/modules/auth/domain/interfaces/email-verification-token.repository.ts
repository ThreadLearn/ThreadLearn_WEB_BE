import { EmailVerificationTokenEntity } from '../entities/email-verification-token.entity';

/**
 * PORT: hợp đồng truy cập Email Verification Token (lưu tokenHash).
 */
export interface IEmailVerificationTokenRepository {
  findByTokenHash(tokenHash: string): Promise<EmailVerificationTokenEntity | null>;
  create(entity: EmailVerificationTokenEntity): Promise<EmailVerificationTokenEntity>;
  update(entity: EmailVerificationTokenEntity): Promise<EmailVerificationTokenEntity>;
  invalidateUnusedByUserId(userId: string): Promise<void>;
}

/** DI token cho `IEmailVerificationTokenRepository`. */
export const EMAIL_VERIFICATION_TOKEN_REPOSITORY = Symbol('EMAIL_VERIFICATION_TOKEN_REPOSITORY');
