import { Inject, Injectable } from '@nestjs/common';
import { BadRequestError, NotFoundError } from '../../../../common/custom-error';
import { IUserRepository, USER_REPOSITORY } from '../../domain/interfaces/user.repository';
import { ITokenService, TOKEN_SERVICE } from '../../domain/interfaces/token-service.port';
import { EMAIL_SENDER, IEmailSender } from '../../domain/interfaces/email-sender.port';
import { ResendVerificationEmailInput, ResendVerificationEmailResult } from '../dto/auth-use-case.dto';

const EMAIL_VERIFICATION_CODE_TTL_MS = 10 * 60 * 1000;

@Injectable()
export class ResendVerificationEmailService {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
    @Inject(TOKEN_SERVICE) private readonly tokenService: ITokenService,
    @Inject(EMAIL_SENDER) private readonly emailSender: IEmailSender,
  ) {}

  async execute(input: ResendVerificationEmailInput): Promise<ResendVerificationEmailResult> {
    const user = await this.userRepo.findByEmail(input.email.trim().toLowerCase());
    if (!user) {
      throw new NotFoundError('User not found.');
    }
    if (user.isVerified) {
      throw new BadRequestError('Email address is already verified.');
    }

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

    return { success: true };
  }
}
