import { Injectable } from '@nestjs/common';
import { env } from '../../../../configs/env';
import { EmailService } from '../../services/email.service';
import {
  IEmailSender,
  SendResetPasswordEmailInput,
  SendVerificationEmailInput,
} from '../../domain/interfaces/email-sender.port';

/**
 * Reset URL base — giữ ĐÚNG behavior hiện tại của AuthService
 * (`process.env.PASSWORD_RESET_URL`, KHÔNG đi qua `env` config object như verify link).
 */
const PASSWORD_RESET_URL = process.env.PASSWORD_RESET_URL || 'http://localhost:3000/reset-password';

/**
 * Adapter cho `IEmailSender` — **wrap `EmailService` hiện tại** để giữ nguyên
 * SMTP behavior (mock-khi-thiếu-config, fire-and-forget + retry backoff, KHÔNG log
 * SMTP_PASS). Adapter dựng link y hệt AuthService:
 *  - verify: `FRONTEND_URL.replace(/\/$/,'') + '/verify-email?token=' + encodeURIComponent(token)`
 *  - reset : `PASSWORD_RESET_URL + '?token=' + encodeURIComponent(token)`
 * KHÔNG log token. Port nhận raw `token`; adapter chỉ nhúng vào link gửi qua email
 * (đúng như flow hiện tại — token KHÔNG xuất hiện ở log của adapter này).
 *
 * Phase DEV1.2: chỉ tạo adapter, CHƯA wire vào runtime (AuthService vẫn tự gửi).
 */
@Injectable()
export class SmtpEmailSenderService implements IEmailSender {
  async sendVerificationEmail(input: SendVerificationEmailInput): Promise<void> {
    const verificationUrl = `${env.FRONTEND_URL.replace(/\/$/, '')}/verify-email?token=${encodeURIComponent(
      input.token,
    )}`;
    await EmailService.sendVerificationEmail({
      email: input.to,
      firstName: input.firstName ?? '',
      verificationUrl,
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
