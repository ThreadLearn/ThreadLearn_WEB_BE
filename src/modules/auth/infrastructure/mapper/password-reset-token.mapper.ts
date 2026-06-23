import { PasswordResetTokenEntity } from '../../domain/entities/password-reset-token.entity';

/**
 * Cầu nối doc ↔ `PasswordResetTokenEntity`. Token lưu dạng `tokenHash` (sha256).
 * Preserve `userId`/`expiresAt`/`usedAt`/timestamps.
 */
export class PasswordResetTokenMapper {
  static toEntity(doc: any): PasswordResetTokenEntity {
    return PasswordResetTokenEntity.fromPersistence({
      id: String(doc._id),
      userId: String(doc.userId),
      tokenHash: doc.tokenHash,
      expiresAt: doc.expiresAt,
      usedAt: doc.usedAt,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  }

  static toPersistence(entity: PasswordResetTokenEntity): Record<string, unknown> {
    const p = entity.toProps();
    const payload: Record<string, unknown> = {
      userId: p.userId,
      tokenHash: p.tokenHash,
      expiresAt: p.expiresAt,
    };
    if (p.usedAt !== undefined) {
      payload.usedAt = p.usedAt;
    }
    return payload;
  }
}
