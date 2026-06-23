import { Injectable } from '@nestjs/common';
import { EmailVerificationToken } from '../../models/email-verification-token.model';
import { EmailVerificationTokenEntity } from '../../domain/entities/email-verification-token.entity';
import { IEmailVerificationTokenRepository } from '../../domain/interfaces/email-verification-token.repository';
import { EmailVerificationTokenMapper } from '../mapper/email-verification-token.mapper';

/**
 * Adapter Mongoose cho `IEmailVerificationTokenRepository` (token lưu tokenHash).
 * `invalidateUnusedByUserId` mirror behavior `AuthService.resendVerification`
 * (đánh dấu `usedAt` cho mọi token chưa dùng của user).
 */
@Injectable()
export class MongoEmailVerificationTokenRepository implements IEmailVerificationTokenRepository {
  async findByTokenHash(tokenHash: string): Promise<EmailVerificationTokenEntity | null> {
    const doc = await EmailVerificationToken.findOne({ tokenHash });
    return doc ? EmailVerificationTokenMapper.toEntity(doc) : null;
  }

  async create(entity: EmailVerificationTokenEntity): Promise<EmailVerificationTokenEntity> {
    const doc = await EmailVerificationToken.create(EmailVerificationTokenMapper.toPersistence(entity));
    return EmailVerificationTokenMapper.toEntity(doc);
  }

  async update(entity: EmailVerificationTokenEntity): Promise<EmailVerificationTokenEntity> {
    const doc = await EmailVerificationToken.findByIdAndUpdate(
      entity.id,
      EmailVerificationTokenMapper.toPersistence(entity),
      { new: true },
    );
    return EmailVerificationTokenMapper.toEntity(doc!);
  }

  async invalidateUnusedByUserId(userId: string): Promise<void> {
    await EmailVerificationToken.updateMany(
      { userId, $or: [{ usedAt: { $exists: false } }, { usedAt: null }] },
      { usedAt: new Date() },
    );
  }
}
