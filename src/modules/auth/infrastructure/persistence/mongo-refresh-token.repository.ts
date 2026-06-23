import { Injectable } from '@nestjs/common';
import { RefreshToken } from '../../models/refresh-token.model';
import { RefreshTokenEntity } from '../../domain/entities/refresh-token.entity';
import { IRefreshTokenRepository } from '../../domain/interfaces/refresh-token.repository';
import { RefreshTokenMapper } from '../mapper/refresh-token.mapper';

/**
 * Adapter Mongoose cho `IRefreshTokenRepository`.
 * Giữ behavior **raw token** hiện tại (`findByToken`/`deleteByToken`).
 * Các method `*ByTokenHash` đã có trong port để chuẩn bị migration; model hiện
 * chưa có field `tokenHash` nên các query đó thực tế chưa khớp doc nào —
 * KHÔNG wire vào runtime ở phase này (xem caveat docs).
 */
@Injectable()
export class MongoRefreshTokenRepository implements IRefreshTokenRepository {
  async findByToken(token: string): Promise<RefreshTokenEntity | null> {
    const doc = await RefreshToken.findOne({ token });
    return doc ? RefreshTokenMapper.toEntity(doc) : null;
  }

  async findByTokenHash(tokenHash: string): Promise<RefreshTokenEntity | null> {
    const doc = await RefreshToken.findOne({ tokenHash });
    return doc ? RefreshTokenMapper.toEntity(doc) : null;
  }

  async create(entity: RefreshTokenEntity): Promise<RefreshTokenEntity> {
    const doc = await RefreshToken.create(RefreshTokenMapper.toPersistence(entity));
    return RefreshTokenMapper.toEntity(doc);
  }

  async deleteByToken(token: string): Promise<void> {
    await RefreshToken.deleteOne({ token });
  }

  async deleteByTokenHash(tokenHash: string): Promise<void> {
    await RefreshToken.deleteMany({ tokenHash });
  }

  async deleteByUserId(userId: string): Promise<void> {
    await RefreshToken.deleteMany({ userId });
  }
}
