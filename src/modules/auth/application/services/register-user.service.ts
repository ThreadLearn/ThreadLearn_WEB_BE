import { Inject, Injectable } from '@nestjs/common';
import { BadRequestError } from '../../../../common/custom-error';
import { UserEntity } from '../../domain/entities/user.entity';
import { IUserRepository, USER_REPOSITORY } from '../../domain/interfaces/user.repository';
import { IPasswordHasher, PASSWORD_HASHER } from '../../domain/interfaces/password-hasher.port';
import { ITokenService, TOKEN_SERVICE } from '../../domain/interfaces/token-service.port';
import { EMAIL_SENDER, IEmailSender } from '../../domain/interfaces/email-sender.port';
import { UserRegisteredHandler } from '../events/user-registered.handler';
import { RegisterUserInput, RegisterUserResult, SafeAuthUser } from '../dto/auth-use-case.dto';

const EMAIL_VERIFICATION_CODE_TTL_MS = 10 * 60 * 1000;

@Injectable()
export class RegisterUserService {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: IPasswordHasher,
    @Inject(TOKEN_SERVICE) private readonly tokenService: ITokenService,
    @Inject(EMAIL_SENDER) private readonly emailSender: IEmailSender,
    private readonly userRegisteredHandler: UserRegisteredHandler,
  ) {}

  async execute(input: RegisterUserInput): Promise<RegisterUserResult> {
    const email = input.email.trim().toLowerCase();
    const existing = await this.userRepo.findByEmail(email);
    if (existing) {
      throw new BadRequestError('Email address is already in use.');
    }

    const passwordHash = await this.passwordHasher.hash(input.password);

    const user = await this.userRepo.create(
      UserEntity.createNew({
        email,
        passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
        role: 'STUDENT',
        isVerified: false,
      }),
    );

    await this.userRegisteredHandler.onUserRegistered(user.id);

    const code = this.tokenService.generateNumericOtp();
    user.setEmailVerificationCode({
      codeHash: this.tokenService.hashVerificationCode(user.id, code),
      expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_CODE_TTL_MS),
    });
    const saved = await this.userRepo.updateEmailVerificationState(user);

    const props = saved.toProps();
    await this.emailSender.sendVerificationEmail({
      to: props.email,
      code,
      firstName: props.firstName,
    });

    return {
      user: this.toSafeUser(saved),
      verificationRequired: true,
      message: 'Please verify your email before logging in.',
    };
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
