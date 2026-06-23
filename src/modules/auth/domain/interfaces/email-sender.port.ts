/**
 * PORT: gửi email auth (verification / reset password). Adapter (infrastructure)
 * wrap `email.service.ts` hiện tại — giữ nguyên SMTP behavior, link format và
 * KHÔNG log token/SMTP_PASS.
 */
export interface SendVerificationEmailInput {
  to: string;
  token: string;
  firstName?: string;
}

export interface SendResetPasswordEmailInput {
  to: string;
  token: string;
  firstName?: string;
}

export interface IEmailSender {
  sendVerificationEmail(input: SendVerificationEmailInput): Promise<void>;
  sendResetPasswordEmail(input: SendResetPasswordEmailInput): Promise<void>;
}

/** DI token cho `IEmailSender`. */
export const EMAIL_SENDER = Symbol('EMAIL_SENDER');
