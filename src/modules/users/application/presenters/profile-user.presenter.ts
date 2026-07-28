import { UserEntity } from '../../../auth/domain/entities/user.entity';
import { ProfileSafeUser } from '../dto/profile-use-case.dto';

/**
 * Presenter `UserEntity → ProfileSafeUser`. Mirror ĐÚNG `sanitizeUser`
 * (auth/utils/user-sanitizer): chỉ whitelist field an toàn, KHÔNG lộ
 * passwordHash/googleId/githubId/lockedAt. Entitlement is included because the
 * authenticated client needs it to render and enforce the current paid plan.
 * KHÔNG import Mongoose/model/schema/infrastructure/`src/utils`.
 *
 * `firstName`/`lastName` fallback `''` (mirror style auth `GetSessionService.toSafeUser`):
 * model luôn có 2 field này nên output tương đương legacy.
 */
export class ProfileUserPresenter {
  static toSafeUser(user: UserEntity): ProfileSafeUser {
    const p = user.toProps();
    return {
      id: p.id,
      email: p.email,
      firstName: p.firstName ?? '',
      lastName: p.lastName ?? '',
      avatarUrl: p.avatarUrl,
      role: p.role,
      isVerified: p.isVerified,
      isActive: p.isActive,
      planType: p.planType ?? 'FREE',
      subscriptionExpiresAt: p.subscriptionExpiresAt,
      subscriptionFeatures: p.subscriptionFeatures ?? [],
      lastLoginAt: p.lastLoginAt,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    };
  }
}
