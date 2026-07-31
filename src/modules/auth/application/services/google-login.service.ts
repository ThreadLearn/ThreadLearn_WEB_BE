import { Inject, Injectable } from '@nestjs/common';
import { BadRequestError, ForbiddenError } from '../../../../common/custom-error';
import { ACCOUNT_LOCKED_MESSAGE } from '../../auth-error-messages';
import { UserEntity } from '../../domain/entities/user.entity';
import { RefreshTokenEntity } from '../../domain/entities/refresh-token.entity';
import { IUserRepository, USER_REPOSITORY } from '../../domain/interfaces/user.repository';
import { ITokenService, TOKEN_SERVICE } from '../../domain/interfaces/token-service.port';
import {
  IRefreshTokenRepository,
  REFRESH_TOKEN_REPOSITORY,
} from '../../domain/interfaces/refresh-token.repository';
import {
  GoogleLoginInput,
  GoogleLoginResult,
  GoogleProfileInput,
  SafeAuthUser,
} from '../dto/auth-use-case.dto';
import { UserRegisteredHandler } from '../events/user-registered.handler';

/** Refresh token sống 7 ngày — giữ đúng TTL của luồng hiện tại. */
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * UC02/UC05 — Google login. Mirror phần xử lý user của `AuthService.loginWithGoogleCode`
 * (việc exchange code → profile do strategy/adapter `GOOGLE_OAUTH` làm TRƯỚC; use-case
 * này nhận profile đã xác thực qua input ⇒ KHÔNG inject `GOOGLE_OAUTH`):
 *
 * 1. Validate profile tối thiểu: email/googleId bắt buộc; reject `emailVerified === false`.
 * 2. Normalize email (`toLowerCase().trim()`).
 * 3. Tìm user **bằng email** (đúng legacy — KHÔNG tra theo googleId).
 * 4. Nếu user tồn tại: chặn inactive/locked → chặn googleId đã link tài khoản Google
 *    khác → link googleId nếu chưa có → set verified → set avatar nếu chưa có →
 *    ghi lastLoginAt → `update`.
 * 5. Nếu chưa tồn tại: tạo UserEntity từ profile (firstName/lastName fallback như
 *    legacy), `isVerified=true`, role STUDENT, link googleId, ghi lastLoginAt →
 *    `create` (KHÔNG tạo passwordHash giả).
 * 6. Ký access+refresh `{ id, email, role }` → lưu refresh token **raw** (TTL 7 ngày).
 * 7. Trả `{ user: SafeAuthUser, accessToken, refreshToken }` (đúng `createAuthResponse`).
 *
 * Chỉ điều phối qua port. KHÔNG log Google profile/token. KHÔNG lộ passwordHash.
 * UserStats parity (DEV1.4B): khi tạo Google user MỚI, gọi `UserRegisteredHandler`
 * (→ `IUserStatsProvisioner`) thay vì import model UserStats. CHƯA wire vào controller.
 */
@Injectable()
export class GoogleLoginService {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
    @Inject(TOKEN_SERVICE) private readonly tokenService: ITokenService,
    @Inject(REFRESH_TOKEN_REPOSITORY) private readonly refreshTokenRepo: IRefreshTokenRepository,
    private readonly userRegisteredHandler: UserRegisteredHandler,
  ) {}

  async execute(input: GoogleLoginInput): Promise<GoogleLoginResult> {
    const profile = input.profile;

    if (!profile?.email) {
      throw new BadRequestError('Google profile email is missing.');
    }
    if (!profile.googleId) {
      throw new BadRequestError('Google profile subject is missing.');
    }
    if (profile.emailVerified === false) {
      throw new BadRequestError('Google profile email is not verified.');
    }

    const verifiedAt = new Date();
    const email = profile.email.toLowerCase().trim();

    const existingUser = await this.userRepo.findByEmail(email);

    let user: UserEntity;
    if (existingUser) {
      this.assertCanAuthenticate(existingUser);

      const p = existingUser.toProps();
      if (p.googleId && p.googleId !== profile.googleId) {
        throw new BadRequestError('Email address is linked to a different Google account.');
      }
      if (!p.googleId) {
        existingUser.linkGoogleAccount(profile.googleId);
      }

      existingUser.markEmailVerified(verifiedAt);

      const picture = profile.avatarUrl ?? profile.picture;
      if (!p.avatarUrl && picture) {
        existingUser.setAvatarUrl(picture);
      }

      existingUser.recordLogin(verifiedAt);
      user = await this.userRepo.update(existingUser);
    } else {
      user = await this.userRepo.create(this.buildGoogleUser(profile, email, verifiedAt));
      // Parity: legacy `createGoogleUser` tạo UserStats cho Google user MỚI. Đi qua
      // side-effect handler (→ IUserStatsProvisioner), KHÔNG import model UserStats.
      await this.userRegisteredHandler.onUserRegistered(user.id);
    }

    const props = user.toProps();
    const payload = { id: props.id, email: props.email, role: props.role, tokenVersion: props.tokenVersion ?? 0 };
    const accessToken = this.tokenService.signAccessToken(payload);
    const refreshToken = this.tokenService.signRefreshToken(payload);

    await this.refreshTokenRepo.create(
      RefreshTokenEntity.createNew({
        userId: props.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      }),
    );

    return {
      user: this.toSafeUser(user),
      accessToken,
      refreshToken,
    };
  }

  /**
   * Mirror `AuthService.createGoogleUser`: fallback name (given/family → name parse →
   * 'Google'/'User'), avatar từ picture, isVerified=true + emailVerifiedAt, role STUDENT,
   * link googleId, ghi lastLoginAt. KHÔNG set passwordHash (Google user không có mật khẩu).
   */
  private buildGoogleUser(
    profile: GoogleProfileInput,
    email: string,
    verifiedAt: Date,
  ): UserEntity {
    const nameParts = (profile.name ?? '').trim().split(/\s+/).filter(Boolean);
    const firstName = profile.firstName || nameParts[0] || 'Google';
    const lastName = profile.lastName || nameParts.slice(1).join(' ') || 'User';
    const picture = profile.avatarUrl ?? profile.picture;

    const user = UserEntity.createNew({
      email,
      firstName,
      lastName,
      avatarUrl: picture,
      role: 'STUDENT',
      isVerified: true,
    });
    user.linkGoogleAccount(profile.googleId);
    user.markEmailVerified(verifiedAt);
    user.recordLogin(verifiedAt);
    return user;
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
