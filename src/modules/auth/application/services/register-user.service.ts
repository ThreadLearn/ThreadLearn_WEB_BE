import { Inject, Injectable } from '@nestjs/common';
import { BadRequestError } from '../../../../common/custom-error';
import { UserEntity } from '../../domain/entities/user.entity';
import { EmailVerificationTokenEntity } from '../../domain/entities/email-verification-token.entity';
import { IUserRepository, USER_REPOSITORY } from '../../domain/interfaces/user.repository';
import { IPasswordHasher, PASSWORD_HASHER } from '../../domain/interfaces/password-hasher.port';
import { ITokenService, TOKEN_SERVICE } from '../../domain/interfaces/token-service.port';
import {
  EMAIL_VERIFICATION_TOKEN_REPOSITORY,
  IEmailVerificationTokenRepository,
} from '../../domain/interfaces/email-verification-token.repository';
import { EMAIL_SENDER, IEmailSender } from '../../domain/interfaces/email-sender.port';
import { UserRegisteredHandler } from '../events/user-registered.handler';
import { RegisterUserInput, RegisterUserResult, SafeAuthUser } from '../dto/auth-use-case.dto';

/** TTL token xác minh email — giữ đúng 24h như luồng đăng ký hiện tại. */
const EMAIL_VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * UC01 — Register account. Mirror luồng đăng ký hiện tại:
 * check trùng email → hash password → tạo user (chưa verify) → sinh + lưu
 * verification token (lưu hash) → gửi email verify → trả safe user + cờ verify.
 *
 * Use-case CHỈ điều phối qua port; không đụng DB/bcrypt/jwt/email trực tiếp.
 * KHÔNG log password/raw token. KHÔNG lộ passwordHash/tokenHash.
 *
 * Phase DEV1.3A: chỉ tạo use-case, CHƯA wire vào AuthModule/runtime.
 */
@Injectable()
export class RegisterUserService {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: IPasswordHasher,
    @Inject(TOKEN_SERVICE) private readonly tokenService: ITokenService,
    @Inject(EMAIL_VERIFICATION_TOKEN_REPOSITORY)
    private readonly emailVerificationTokenRepo: IEmailVerificationTokenRepository,
    @Inject(EMAIL_SENDER) private readonly emailSender: IEmailSender,
    private readonly userRegisteredHandler: UserRegisteredHandler,
  ) {}

  async execute(input: RegisterUserInput): Promise<RegisterUserResult> {
    const existing = await this.userRepo.findByEmail(input.email);
    if (existing) {
      throw new BadRequestError('Email address is already in use.');
    }

    const passwordHash = await this.passwordHasher.hash(input.password);

    const user = await this.userRepo.create(
      UserEntity.createNew({
        email: input.email,
        passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
        role: 'STUDENT',
        isVerified: false,
      }),
    );

    // Parity: legacy tạo UserStats ngay sau khi tạo user. Đi qua side-effect handler
    // (→ IUserStatsProvisioner) thay vì import model UserStats vào application.
    await this.userRegisteredHandler.onUserRegistered(user.id);

    // Sinh raw token, chỉ LƯU hash (raw token chỉ đi trong link email).
    const rawToken = this.tokenService.generateRandomToken();
    const tokenHash = this.tokenService.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_TOKEN_TTL_MS);

    await this.emailVerificationTokenRepo.create(
      EmailVerificationTokenEntity.createNew({ userId: user.id, tokenHash, expiresAt }),
    );

    const props = user.toProps();
    await this.emailSender.sendVerificationEmail({
      to: props.email,
      token: rawToken,
      firstName: props.firstName,
    });

    return {
      user: this.toSafeUser(user),
      verificationRequired: true,
      message: 'Please verify your email before logging in.',
    };
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
