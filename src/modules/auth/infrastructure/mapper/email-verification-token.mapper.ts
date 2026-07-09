import { EmailVerificationTokenEntity } from '../../domain/entities/email-verification-token.entity';

/**
 * Cầu nối doc ↔ `EmailVerificationTokenEntity`. Token lưu dạng `tokenHash` (sha256).
 * Preserve `userId`/`expiresAt`/`usedAt`/timestamps.
 */
export class EmailVerificationTokenMapper {
  static toEntity(doc: any): EmailVerificationTokenEntity {
    return EmailVerificationTokenEntity.fromPersistence({
      id: String(doc._id),
      userId: String(doc.userId),
      tokenHash: doc.tokenHash,
      expiresAt: doc.expiresAt,
      usedAt: doc.usedAt,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  }

  static toPersistence(entity: EmailVerificationTokenEntity): Record<string, unknown> {
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
