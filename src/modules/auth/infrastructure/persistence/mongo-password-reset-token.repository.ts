import { Injectable } from '@nestjs/common';
import { PasswordResetToken } from '../../models/password-reset-token.model';
import { PasswordResetTokenEntity } from '../../domain/entities/password-reset-token.entity';
import { IPasswordResetTokenRepository } from '../../domain/interfaces/password-reset-token.repository';
import { PasswordResetTokenMapper } from '../mapper/password-reset-token.mapper';

/**
 * Adapter Mongoose cho `IPasswordResetTokenRepository` (token lưu tokenHash).
 * `invalidateUnusedByUserId` mirror behavior `AuthService.forgotPassword`
 * (đánh dấu `usedAt` cho mọi token chưa dùng của user).
 */
@Injectable()
export class MongoPasswordResetTokenRepository implements IPasswordResetTokenRepository {
  async findByTokenHash(tokenHash: string): Promise<PasswordResetTokenEntity | null> {
    const doc = await PasswordResetToken.findOne({ tokenHash });
    return doc ? PasswordResetTokenMapper.toEntity(doc) : null;
  }

  async create(entity: PasswordResetTokenEntity): Promise<PasswordResetTokenEntity> {
    const doc = await PasswordResetToken.create(PasswordResetTokenMapper.toPersistence(entity));
    return PasswordResetTokenMapper.toEntity(doc);
  }

  async update(entity: PasswordResetTokenEntity): Promise<PasswordResetTokenEntity> {
    const doc = await PasswordResetToken.findByIdAndUpdate(
      entity.id,
      PasswordResetTokenMapper.toPersistence(entity),
      { new: true },
    );
    return PasswordResetTokenMapper.toEntity(doc!);
  }

  async invalidateUnusedByUserId(userId: string): Promise<void> {
    await PasswordResetToken.updateMany(
      { userId, $or: [{ usedAt: { $exists: false } }, { usedAt: null }] },
      { usedAt: new Date() },
    );
  }
}
