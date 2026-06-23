import { Inject, Injectable } from '@nestjs/common';
import { BadRequestError, NotFoundError } from '../../../../common/custom-error';
import { EmailVerificationTokenEntity } from '../../domain/entities/email-verification-token.entity';
import { IUserRepository, USER_REPOSITORY } from '../../domain/interfaces/user.repository';
import { ITokenService, TOKEN_SERVICE } from '../../domain/interfaces/token-service.port';
import {
  EMAIL_VERIFICATION_TOKEN_REPOSITORY,
  IEmailVerificationTokenRepository,
} from '../../domain/interfaces/email-verification-token.repository';
import { EMAIL_SENDER, IEmailSender } from '../../domain/interfaces/email-sender.port';
import { ResendVerificationEmailInput, ResendVerificationEmailResult } from '../dto/auth-use-case.dto';

/** TTL token xác minh email — giữ đúng 24h. */
const EMAIL_VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * UC03 — Resend verification email. Mirror luồng hiện tại:
 * tìm user → (không có: báo lỗi) → (đã verify: báo lỗi) → vô hiệu các token chưa
 * dùng → sinh raw token + lưu hash (TTL 24h) → gửi lại email verify.
 *
 * Chỉ điều phối qua port. KHÔNG log raw token. KHÔNG lộ tokenHash.
 * Phase DEV1.3B: chưa wire runtime.
 */
@Injectable()
export class ResendVerificationEmailService {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
    @Inject(EMAIL_VERIFICATION_TOKEN_REPOSITORY)
    private readonly verificationTokenRepo: IEmailVerificationTokenRepository,
    @Inject(TOKEN_SERVICE) private readonly tokenService: ITokenService,
    @Inject(EMAIL_SENDER) private readonly emailSender: IEmailSender,
  ) {}

  async execute(input: ResendVerificationEmailInput): Promise<ResendVerificationEmailResult> {
    const user = await this.userRepo.findByEmail(input.email);
    if (!user) {
      throw new NotFoundError('User not found.');
    }
    if (user.isVerified) {
      throw new BadRequestError('Email address is already verified.');
    }

    await this.verificationTokenRepo.invalidateUnusedByUserId(user.id);

    const rawToken = this.tokenService.generateRandomToken();
    const tokenHash = this.tokenService.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_TOKEN_TTL_MS);

    await this.verificationTokenRepo.create(
      EmailVerificationTokenEntity.createNew({ userId: user.id, tokenHash, expiresAt }),
    );

    const props = user.toProps();
    await this.emailSender.sendVerificationEmail({
      to: props.email,
      token: rawToken,
      firstName: props.firstName,
    });

    return { success: true };
  }
}
