import { UserEntity, UserProps } from '../../domain/entities/user.entity';
import { UserRole } from '../../domain/value-objects/user-role.vo';

/**
 * Cầu nối doc (Mongoose) ↔ `UserEntity`. Đây KHÔNG phải presenter:
 * `passwordHash` được map vào props (phục vụ persistence/so khớp), không lộ ra HTTP.
 *
 * Lưu ý preserve legacy: model thật còn `planType`/`subscriptionExpiresAt`/`googleId`/
 * `githubId`/`failedLoginAttempts`/`lockedUntil` mà `UserProps` skeleton chưa quản lý.
 * `toPersistence` chỉ set các field entity nắm giữ và LOẠI BỎ field `undefined`
 * để KHÔNG ghi đè/xoá nhầm các field legacy đó khi update.
 */
export class UserMapper {
  static toEntity(doc: any): UserEntity {
    return UserEntity.fromPersistence({
      id: String(doc._id),
      email: doc.email,
      passwordHash: doc.passwordHash,
      firstName: doc.firstName,
      lastName: doc.lastName,
      avatarUrl: doc.avatarUrl,
      googleId: doc.googleId,
      role: doc.role as UserRole,
      isVerified: !!doc.isVerified,
      emailVerifiedAt: doc.emailVerifiedAt,
      emailVerificationCodeHash: doc.emailVerificationCodeHash,
      emailVerificationCodeExpiresAt: doc.emailVerificationCodeExpiresAt,
      emailVerificationCodeAttempts: doc.emailVerificationCodeAttempts,
      emailVerificationLastSentAt: doc.emailVerificationLastSentAt,
      isActive: doc.isActive !== false,
      lockedAt: doc.lockedAt,
      lockedReason: doc.lockedReason,
      failedLoginAttempts: doc.failedLoginAttempts,
      lockedUntil: doc.lockedUntil,
      lastLoginAt: doc.lastLoginAt,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  }

  static toPersistence(entity: UserEntity): Record<string, unknown> {
    const p: UserProps = entity.toProps();
    const payload: Record<string, unknown> = {
      email: p.email,
      passwordHash: p.passwordHash,
      firstName: p.firstName,
      lastName: p.lastName,
      avatarUrl: p.avatarUrl,
      googleId: p.googleId,
      role: p.role,
      isVerified: p.isVerified,
      emailVerifiedAt: p.emailVerifiedAt,
      emailVerificationCodeHash: p.emailVerificationCodeHash,
      emailVerificationCodeExpiresAt: p.emailVerificationCodeExpiresAt,
      emailVerificationCodeAttempts: p.emailVerificationCodeAttempts,
      emailVerificationLastSentAt: p.emailVerificationLastSentAt,
      isActive: p.isActive,
      lockedAt: p.lockedAt,
      lockedReason: p.lockedReason,
      failedLoginAttempts: p.failedLoginAttempts,
      lockedUntil: p.lockedUntil,
      lastLoginAt: p.lastLoginAt,
    };
    // KHÔNG set _id/timestamps. Loại field undefined để không đụng field legacy.
    for (const key of Object.keys(payload)) {
      if (payload[key] === undefined) {
        delete payload[key];
      }
    }
    return payload;
  }
}
