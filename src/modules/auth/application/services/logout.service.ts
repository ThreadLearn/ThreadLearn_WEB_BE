import { Inject, Injectable } from '@nestjs/common';
import {
  IRefreshTokenRepository,
  REFRESH_TOKEN_REPOSITORY,
} from '../../domain/interfaces/refresh-token.repository';
import { LogoutInput, LogoutResult } from '../dto/auth-use-case.dto';
import { ITokenService, TOKEN_SERVICE } from '../../domain/interfaces/token-service.port';
import { IUserRepository, USER_REPOSITORY } from '../../domain/interfaces/user.repository';

/**
 * UC06 — Logout. Mirror `AuthService.logout(token)` hiện tại:
 * chỉ xoá raw refresh token khỏi store (`deleteOne({ token })` → `deleteByToken`).
 *
 * Legacy KHÔNG verify token trước khi xoá, KHÔNG check user, và xoá là **idempotent**
 * (không lỗi nếu token không tồn tại) — KHÔNG để lộ token có hợp lệ hay không.
 * KHÔNG logout-all theo userId (legacy không làm). KHÔNG log refresh token.
 *
 * Phase DEV1.3C: chưa wire runtime.
 */
@Injectable()
export class LogoutService {
  constructor(
    @Inject(REFRESH_TOKEN_REPOSITORY) private readonly refreshTokenRepo: IRefreshTokenRepository,
    @Inject(TOKEN_SERVICE) private readonly tokenService: ITokenService,
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
  ) {}

  async execute(input: LogoutInput): Promise<LogoutResult> {
    try {
      const decoded = this.tokenService.verifyRefreshToken(input.refreshToken) as { id?: string };
      if (decoded.id) {
        const user = await this.userRepo.findById(decoded.id);
        if (user) {
          user.revokeTokens();
          await this.userRepo.update(user);
        }
      }
    } catch {
      // Keep logout idempotent and do not disclose whether a token was valid.
    }
    await this.refreshTokenRepo.deleteByToken(input.refreshToken);
    return { success: true };
  }
}
