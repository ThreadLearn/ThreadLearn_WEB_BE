import { RefreshTokenEntity } from '../../domain/entities/refresh-token.entity';

/**
 * Cầu nối doc ↔ `RefreshTokenEntity`.
 * Behavior hiện tại: lưu **raw token** (`token`). `tokenHash` chỉ map nếu có
 * (model hiện chưa có field này) — KHÔNG đổi storage sang hashed ở phase này.
 * `revokedAt` không có trong model hiện tại (revoke = delete), nên không persist.
 */
export class RefreshTokenMapper {
  static toEntity(doc: any): RefreshTokenEntity {
    return RefreshTokenEntity.fromPersistence({
      id: String(doc._id),
      userId: String(doc.userId),
      token: doc.token,
      tokenHash: doc.tokenHash,
      expiresAt: doc.expiresAt,
      createdAt: doc.createdAt,
    });
  }

  static toPersistence(entity: RefreshTokenEntity): Record<string, unknown> {
    const p = entity.toProps();
    const payload: Record<string, unknown> = {
      token: p.token,
      userId: p.userId,
      expiresAt: p.expiresAt,
    };
    if (p.tokenHash !== undefined) {
      payload.tokenHash = p.tokenHash;
    }
    return payload;
  }
}
