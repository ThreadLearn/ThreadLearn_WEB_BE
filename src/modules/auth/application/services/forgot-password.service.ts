import { Inject, Injectable } from '@nestjs/common';
import { PasswordResetTokenEntity } from '../../domain/entities/password-reset-token.entity';
import { IUserRepository, USER_REPOSITORY } from '../../domain/interfaces/user.repository';
import { ITokenService, TOKEN_SERVICE } from '../../domain/interfaces/token-service.port';
import {
  IPasswordResetTokenRepository,
  PASSWORD_RESET_TOKEN_REPOSITORY,
} from '../../domain/interfaces/password-reset-token.repository';
import { EMAIL_SENDER, IEmailSender } from '../../domain/interfaces/email-sender.port';
import { ForgotPasswordInput, ForgotPasswordResult } from '../dto/auth-use-case.dto';

/** TTL token reset password — giữ đúng 1h. */
const PASSWORD_RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

/**
 * UC07 — Forgot password. Mirror luồng hiện tại (anti-enumeration):
 * tìm user → nếu không tồn tại HOẶC inactive → trả generic `success` im lặng →
 * vô hiệu reset token chưa dùng → sinh raw token + lưu hash (TTL 1h) → gửi email reset.
 *
 * LUÔN trả `{ success: true }`; controller trả message trung lập.
 * Chỉ điều phối qua port. KHÔNG log raw token. KHÔNG lộ tokenHash/sự tồn tại user.
 * Phase DEV1.3B: chưa wire runtime.
 */
@Injectable()
export class ForgotPasswordService {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
    @Inject(PASSWORD_RESET_TOKEN_REPOSITORY)
    private readonly resetTokenRepo: IPasswordResetTokenRepository,
    @Inject(TOKEN_SERVICE) private readonly tokenService: ITokenService,
    @Inject(EMAIL_SENDER) private readonly emailSender: IEmailSender,
  ) {}

  async execute(input: ForgotPasswordInput): Promise<ForgotPasswordResult> {
    const user = await this.userRepo.findByEmail(input.email);
    if (!user || user.isActive === false) {
      return { success: true };
    }

    await this.resetTokenRepo.invalidateUnusedByUserId(user.id);

    const rawToken = this.tokenService.generateRandomToken();
    const tokenHash = this.tokenService.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS);

    await this.resetTokenRepo.create(
      PasswordResetTokenEntity.createNew({ userId: user.id, tokenHash, expiresAt }),
    );

    const props = user.toProps();
    await this.emailSender.sendResetPasswordEmail({
      to: props.email,
      token: rawToken,
      firstName: props.firstName,
    });

    return { success: true };
  }
}
