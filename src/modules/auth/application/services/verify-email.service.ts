import { Inject, Injectable } from '@nestjs/common';
import { BadRequestError } from '../../../../common/custom-error';
import { UserEntity } from '../../domain/entities/user.entity';
import { IUserRepository, USER_REPOSITORY } from '../../domain/interfaces/user.repository';
import { ITokenService, TOKEN_SERVICE } from '../../domain/interfaces/token-service.port';
import { SafeAuthUser, VerifyEmailInput, VerifyEmailResult } from '../dto/auth-use-case.dto';

const MAX_EMAIL_VERIFICATION_ATTEMPTS = 5;

@Injectable()
export class VerifyEmailService {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
    @Inject(TOKEN_SERVICE) private readonly tokenService: ITokenService,
  ) {}

  async execute(input: VerifyEmailInput): Promise<VerifyEmailResult> {
    const user = await this.userRepo.findByEmail(input.email.trim().toLowerCase());
    if (!user) {
      throw new BadRequestError('Verification code is invalid or expired.');
    }

    if (user.isVerified) {
      return { user: this.toSafeUser(user) };
    }

    const props = user.toProps();
    if (!props.emailVerificationCodeHash || !props.emailVerificationCodeExpiresAt) {
      throw new BadRequestError('Verification code is invalid or expired.');
    }
    if (props.emailVerificationCodeExpiresAt.getTime() < Date.now()) {
      throw new BadRequestError('Verification code is invalid or expired.');
    }
    if ((props.emailVerificationCodeAttempts ?? 0) >= MAX_EMAIL_VERIFICATION_ATTEMPTS) {
      throw new BadRequestError('Verification code is invalid or expired.');
    }

    const codeHash = this.tokenService.hashVerificationCode(props.id, input.code);
    if (codeHash !== props.emailVerificationCodeHash) {
      user.recordFailedEmailVerificationAttempt();
      await this.userRepo.updateEmailVerificationState(user);
      throw new BadRequestError('Verification code is invalid.');
    }

    user.markEmailVerified(new Date());
    user.clearEmailVerificationCode();
    const saved = await this.userRepo.updateEmailVerificationState(user);

    return { user: this.toSafeUser(saved) };
  }

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
