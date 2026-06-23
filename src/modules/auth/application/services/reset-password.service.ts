import { Inject, Injectable } from '@nestjs/common';
import { BadRequestError, NotFoundError } from '../../../../common/custom-error';
import { IUserRepository, USER_REPOSITORY } from '../../domain/interfaces/user.repository';
import { IPasswordHasher, PASSWORD_HASHER } from '../../domain/interfaces/password-hasher.port';
import { ITokenService, TOKEN_SERVICE } from '../../domain/interfaces/token-service.port';
import {
  IPasswordResetTokenRepository,
  PASSWORD_RESET_TOKEN_REPOSITORY,
} from '../../domain/interfaces/password-reset-token.repository';
import {
  IRefreshTokenRepository,
  REFRESH_TOKEN_REPOSITORY,
} from '../../domain/interfaces/refresh-token.repository';
import { ResetPasswordInput, ResetPasswordResult } from '../dto/auth-use-case.dto';

/**
 * UC08 — Reset password. Mirror luồng hiện tại:
 * hash raw token → tra cứu reset token → chặn invalid/used/expired → tìm user →
 * hash mật khẩu mới → đổi passwordHash → đánh dấu token used → lưu user + token →
 * **revoke toàn bộ refresh token của user** (đăng xuất mọi nơi, đúng behavior cũ).
 *
 * Chỉ điều phối qua port. KHÔNG log password/raw token. KHÔNG lộ passwordHash/tokenHash.
 * Phase DEV1.3B: chưa wire runtime.
 */
@Injectable()
export class ResetPasswordService {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
    @Inject(PASSWORD_RESET_TOKEN_REPOSITORY)
    private readonly resetTokenRepo: IPasswordResetTokenRepository,
    @Inject(TOKEN_SERVICE) private readonly tokenService: ITokenService,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: IPasswordHasher,
    @Inject(REFRESH_TOKEN_REPOSITORY) private readonly refreshTokenRepo: IRefreshTokenRepository,
  ) {}

  async execute(input: ResetPasswordInput): Promise<ResetPasswordResult> {
    const tokenHash = this.tokenService.hashToken(input.token);
    const resetToken = await this.resetTokenRepo.findByTokenHash(tokenHash);

    if (!resetToken) {
      throw new BadRequestError('Password reset token is invalid.');
    }
    if (resetToken.isUsed()) {
      throw new BadRequestError('Password reset token has already been used.');
    }
    if (resetToken.isExpired()) {
      throw new BadRequestError('Password reset token has expired.');
    }

    const user = await this.userRepo.findById(resetToken.userId);
    if (!user) {
      throw new NotFoundError('User for password reset token was not found.');
    }

    const newHash = await this.passwordHasher.hash(input.newPassword);
    user.changePasswordHash(newHash);
    resetToken.markUsed();

    await this.userRepo.update(user);
    await this.resetTokenRepo.update(resetToken);
    await this.refreshTokenRepo.deleteByUserId(user.id);

    return { success: true };
  }
}
