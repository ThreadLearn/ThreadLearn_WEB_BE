import { Injectable } from '@nestjs/common';
import { EmailService } from '../../services/email.service';
import {
  IEmailSender,
  SendResetPasswordEmailInput,
  SendVerificationEmailInput,
} from '../../domain/interfaces/email-sender.port';

const PASSWORD_RESET_URL = process.env.PASSWORD_RESET_URL || 'http://localhost:3001/reset-password';

@Injectable()
export class SmtpEmailSenderService implements IEmailSender {
  async sendVerificationEmail(input: SendVerificationEmailInput): Promise<void> {
    await EmailService.sendVerificationEmail({
      email: input.to,
      firstName: input.firstName ?? '',
      code: input.code,
    });
  }

  async sendResetPasswordEmail(input: SendResetPasswordEmailInput): Promise<void> {
    const resetUrl = `${PASSWORD_RESET_URL}?token=${encodeURIComponent(input.token)}`;
    await EmailService.sendPasswordResetEmail({
      email: input.to,
      firstName: input.firstName ?? '',
      resetUrl,
    });
  }
}
