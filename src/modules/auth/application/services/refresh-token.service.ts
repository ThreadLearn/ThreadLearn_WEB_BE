import { Inject, Injectable } from '@nestjs/common';
import { ForbiddenError, UnauthorizedError } from '../../../../common/custom-error';
import { ACCOUNT_LOCKED_MESSAGE } from '../../auth-error-messages';
import { UserEntity } from '../../domain/entities/user.entity';
import { RefreshTokenEntity } from '../../domain/entities/refresh-token.entity';
import { IUserRepository, USER_REPOSITORY } from '../../domain/interfaces/user.repository';
import { ITokenService, TOKEN_SERVICE } from '../../domain/interfaces/token-service.port';
import {
  IRefreshTokenRepository,
  REFRESH_TOKEN_REPOSITORY,
} from '../../domain/interfaces/refresh-token.repository';
import { RefreshTokenInput, RefreshTokenResult } from '../dto/auth-use-case.dto';

/** Refresh token sống 7 ngày — giữ đúng TTL của luồng hiện tại. */
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** Payload tối thiểu giải mã từ refresh token (tương thích `JWTPayload`/`TokenPayload`). */
type DecodedRefresh = { id: string; email: string; role: string; tokenVersion?: number };

/**
 * Refresh token rotation. Mirror luồng `AuthService.refresh` hiện tại:
 *
 * 1. Tra raw refresh token trong store (`findByToken`).
 * 2. **Reuse-detection:** nếu token KHÔNG có trong store nhưng chữ ký hợp lệ ⇒
 *    coi như token đã bị xoay vòng/đánh cắp → revoke TOÀN BỘ refresh token của user
 *    (`deleteByUserId`) rồi reject. Chữ ký sai ⇒ chỉ reject.
 * 3. Token có trong store nhưng quá hạn ⇒ xoá token đó rồi reject.
 * 4. Verify chữ ký refresh token; thất bại ⇒ reject ('verification failed').
 * 5. Tìm user theo id; không tồn tại ⇒ xoá token rồi reject.
 * 6. Chặn user inactive/locked (`assertUserCanAuthenticate`).
 * 7. **Rotation:** xoá raw token cũ → ký access+refresh mới `{ id, email, role }` →
 *    lưu refresh mới **raw** (TTL 7 ngày).
 * 8. Trả `{ accessToken, refreshToken }` (đúng `return tokens` hiện tại — KHÔNG user).
 *
 * Chỉ điều phối qua port. KHÔNG log raw/access/refresh token. Refresh token vẫn
 * lưu raw (KHÔNG hash ở phase này). Phase DEV1.3C: chưa wire runtime.
 */
@Injectable()
export class RefreshTokenService {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
    @Inject(REFRESH_TOKEN_REPOSITORY) private readonly refreshTokenRepo: IRefreshTokenRepository,
    @Inject(TOKEN_SERVICE) private readonly tokenService: ITokenService,
  ) {}

  async execute(input: RefreshTokenInput): Promise<RefreshTokenResult> {
    const rawToken = input.refreshToken;
    const storedToken = await this.refreshTokenRepo.findByToken(rawToken);

    // SECURITY (P0): reuse detection. Token verify chữ ký nhưng không có trong
    // store ⇒ đã bị xoay vòng trước đó / đang bị replay ⇒ revoke mọi session.
    if (!storedToken) {
      try {
        const decoded = this.tokenService.verifyRefreshToken(rawToken) as { id?: string };
        if (decoded?.id) {
          await this.refreshTokenRepo.deleteByUserId(decoded.id);
        }
      } catch {
        // Chữ ký sai — không có gì để revoke, chỉ reject.
      }
      throw new UnauthorizedError('Refresh token is invalid or has expired.');
    }

    if (storedToken.isExpired()) {
      await this.refreshTokenRepo.deleteByToken(rawToken);
      throw new UnauthorizedError('Refresh token is invalid or has expired.');
    }

    let decoded: DecodedRefresh;
    try {
      decoded = this.tokenService.verifyRefreshToken(rawToken) as DecodedRefresh;
    } catch {
      throw new UnauthorizedError('Refresh token verification failed.');
    }

    const user = await this.userRepo.findById(decoded.id);
    if (!user) {
      await this.refreshTokenRepo.deleteByToken(rawToken);
      throw new UnauthorizedError('Refresh token user no longer exists.');
    }

    this.assertCanAuthenticate(user);
    const userTokenVersion = user.toProps().tokenVersion ?? 0;
    if ((decoded.tokenVersion ?? 0) !== userTokenVersion) {
      await this.refreshTokenRepo.deleteByToken(rawToken);
      throw new UnauthorizedError('Refresh token has been revoked.');
    }

    // Rotation: xoá token cũ trước, tạo token mới sau (mirror legacy).
    await this.refreshTokenRepo.deleteByToken(rawToken);

    const props = user.toProps();
    const payload = { id: props.id, email: props.email, role: props.role, tokenVersion: userTokenVersion };
    const accessToken = this.tokenService.signAccessToken(payload);
    const refreshToken = this.tokenService.signRefreshToken(payload);

    await this.refreshTokenRepo.create(
      RefreshTokenEntity.createNew({
        userId: decoded.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      }),
    );

    return { accessToken, refreshToken };
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
}
