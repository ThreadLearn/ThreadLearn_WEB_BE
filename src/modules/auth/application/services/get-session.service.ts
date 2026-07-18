import { Inject, Injectable } from '@nestjs/common';
import { ForbiddenError, UnauthorizedError } from '../../../../common/custom-error';
import { ACCOUNT_LOCKED_MESSAGE } from '../../auth-error-messages';
import { UserEntity } from '../../domain/entities/user.entity';
import { IUserRepository, USER_REPOSITORY } from '../../domain/interfaces/user.repository';
import { GetSessionInput, GetSessionResult, SafeAuthUser } from '../dto/auth-use-case.dto';

/**
 * Get session user. Mirror `AuthService.getSessionUser(userId)` hiện tại:
 * tìm user theo id (do `JwtAuthGuard`/`@CurrentUser` cung cấp) → reject nếu user
 * không còn tồn tại → chặn inactive/locked → trả safe user.
 *
 * Use-case nhận `userId` từ input (KHÔNG tự decode JWT — guard đã decode ở
 * presentation). KHÔNG lộ passwordHash/tokenHash. Phase DEV1.3C: chưa wire runtime.
 */
@Injectable()
export class GetSessionService {
  constructor(@Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository) {}

  async execute(input: GetSessionInput): Promise<GetSessionResult> {
    const user = await this.userRepo.findById(input.userId);
    if (!user) {
      throw new UnauthorizedError('Authenticated user no longer exists.');
    }

    this.assertCanAuthenticate(user);

    return { user: this.toSafeUser(user) };
  }

  /** Mirror `assertUserCanAuthenticate`: chặn inactive hoặc locked. */
  private assertCanAuthenticate(user: UserEntity): void {
    const p = user.toProps();
    if (p.isActive === false) {
      throw new ForbiddenError(ACCOUNT_LOCKED_MESSAGE);
    }
    if (p.lockedAt) {
      throw new ForbiddenError(ACCOUNT_LOCKED_MESSAGE);
    }
  }

  /** Whitelist field an toàn — mirror `sanitizeUser`. */
  private toSafeUser(user: UserEntity): SafeAuthUser {
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
      lastLoginAt: p.lastLoginAt,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    };
  }
}
