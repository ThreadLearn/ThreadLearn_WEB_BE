import { Inject, Injectable } from '@nestjs/common';
import { BadRequestError, NotFoundError } from '../../../../common/custom-error';
import { UserEntity } from '../../domain/entities/user.entity';
import { IUserRepository, USER_REPOSITORY } from '../../domain/interfaces/user.repository';
import { ITokenService, TOKEN_SERVICE } from '../../domain/interfaces/token-service.port';
import {
  EMAIL_VERIFICATION_TOKEN_REPOSITORY,
  IEmailVerificationTokenRepository,
} from '../../domain/interfaces/email-verification-token.repository';
import { SafeAuthUser, VerifyEmailInput, VerifyEmailResult } from '../dto/auth-use-case.dto';

/**
 * UC03 — Verify email. Mirror luồng xác minh hiện tại:
 * hash raw token → tra cứu token → chặn invalid/used/expired → tìm user →
 * (nếu đã verify: đánh dấu token used rồi báo lỗi) → markEmailVerified + markUsed →
 * lưu cả hai → trả `{ user: safe user }`.
 *
 * Chỉ điều phối qua port. KHÔNG log raw token. KHÔNG lộ tokenHash/passwordHash.
 * Phase DEV1.3B: chưa wire runtime.
 */
@Injectable()
export class VerifyEmailService {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
    @Inject(EMAIL_VERIFICATION_TOKEN_REPOSITORY)
    private readonly verificationTokenRepo: IEmailVerificationTokenRepository,
    @Inject(TOKEN_SERVICE) private readonly tokenService: ITokenService,
  ) {}

  async execute(input: VerifyEmailInput): Promise<VerifyEmailResult> {
    const tokenHash = this.tokenService.hashToken(input.token);
    const verificationToken = await this.verificationTokenRepo.findByTokenHash(tokenHash);

    if (!verificationToken) {
      throw new BadRequestError('Verification token is invalid.');
    }
    if (verificationToken.isUsed()) {
      throw new BadRequestError('Verification token has already been used.');
    }
    if (verificationToken.isExpired()) {
      throw new BadRequestError('Verification token has expired.');
    }

    const user = await this.userRepo.findById(verificationToken.userId);
    if (!user) {
      throw new NotFoundError('User for verification token was not found.');
    }

    if (user.isVerified) {
      verificationToken.markUsed();
      await this.verificationTokenRepo.update(verificationToken);
      throw new BadRequestError('Email address is already verified.');
    }

    const now = new Date();
    user.markEmailVerified(now);
    verificationToken.markUsed(now);

    await this.userRepo.update(user);
    await this.verificationTokenRepo.update(verificationToken);

    return { user: this.toSafeUser(user) };
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
