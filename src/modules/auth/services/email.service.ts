import nodemailer from 'nodemailer';
import { logger } from '../../../configs/logger';
import { env } from '../../../configs/env';

type VerificationEmailPayload = {
  email: string;
  firstName: string;
  verificationUrl: string;
};

type PasswordResetEmailPayload = {
  email: string;
  firstName: string;
  resetUrl: string;
};

type StudentInvitationEmailPayload = {
  email: string;
  firstName: string;
  temporaryPassword: string;
};

export class EmailService {
  static async sendVerificationEmail(payload: VerificationEmailPayload) {
    if (!this.hasSmtpConfig()) {
      logger.info(
        `Mock verification email sent to ${payload.email} for ${payload.firstName}: ${payload.verificationUrl}`
      );
      return;
    }

    this.dispatch(
      'Verification email',
      {
        to: payload.email,
        subject: 'Verify your ThreadLearn email',
        text: [
          `Hi ${payload.firstName},`,
          '',
          'Please verify your ThreadLearn email address using the link below:',
          payload.verificationUrl,
          '',
          'This link will expire soon. If you did not create a ThreadLearn account, you can ignore this email.',
        ].join('\n'),
        html: `
        <p>Hi ${this.escapeHtml(payload.firstName)},</p>
        <p>Please verify your ThreadLearn email address using the link below:</p>
        <p><a href="${this.escapeHtml(payload.verificationUrl)}">Verify your email</a></p>
        <p>This link will expire soon. If you did not create a ThreadLearn account, you can ignore this email.</p>
      `,
      },
      `SMTP verification email sent to ${payload.email}`
    );
  }

  static async sendPasswordResetEmail(payload: PasswordResetEmailPayload) {
    if (!this.hasSmtpConfig()) {
      logger.info(`Mock password reset email sent to ${payload.email} for ${payload.firstName}: ${payload.resetUrl}`);
      return;
    }

    this.dispatch(
      'Password reset email',
      {
        to: payload.email,
        subject: 'Reset your ThreadLearn password',
        text: [
          `Hi ${payload.firstName},`,
          '',
          'Use the link below to reset your ThreadLearn password:',
          payload.resetUrl,
          '',
          'This link will expire soon. If you did not request a password reset, you can ignore this email.',
        ].join('\n'),
        html: `
        <p>Hi ${this.escapeHtml(payload.firstName)},</p>
        <p>Use the link below to reset your ThreadLearn password:</p>
        <p><a href="${this.escapeHtml(payload.resetUrl)}">Reset your password</a></p>
        <p>This link will expire soon. If you did not request a password reset, you can ignore this email.</p>
      `,
      },
      `SMTP reset password email sent to ${payload.email}`
    );
  }

  static async sendStudentInvitationEmail(payload: StudentInvitationEmailPayload) {
    if (!this.hasSmtpConfig()) {
      logger.info(
        `Mock student invitation email sent to ${payload.email} for ${payload.firstName}. Temporary password: ${payload.temporaryPassword}`
      );
      return;
    }

    this.dispatch('Student invitation email', {
      to: payload.email,
      subject: 'Your ThreadLearn account is ready',
      text: [
        `Hi ${payload.firstName},`,
        '',
        'An admin has created a ThreadLearn account for you.',
        `Temporary password: ${payload.temporaryPassword}`,
        '',
        'Please sign in and change your password as soon as possible.',
      ].join('\n'),
      html: `
        <p>Hi ${this.escapeHtml(payload.firstName)},</p>
        <p>An admin has created a ThreadLearn account for you.</p>
        <p><strong>Temporary password:</strong> ${this.escapeHtml(payload.temporaryPassword)}</p>
        <p>Please sign in and change your password as soon as possible.</p>
      `,
    });
  }

  /**
   * Gmail app passwords are shown grouped with spaces (e.g. "abcd efgh ijkl mnop").
   * Strip all whitespace so a value copied verbatim still authenticates.
   * Never logged, raw or normalized.
   */
  private static normalizedSmtpPass() {
    return (env.SMTP_PASS ?? '').replace(/\s+/g, '');
  }

  /**
   * SMTP is used only when every required value is present. When the config is
   * incomplete we fall back to mock logging; when it is complete but wrong we
   * still attempt SMTP and surface a clear failure (see dispatch) instead of
   * silently mocking.
   */
  private static hasSmtpConfig() {
    return Boolean(
      env.SMTP_HOST && env.SMTP_PORT && env.SMTP_USER && this.normalizedSmtpPass() && env.MAIL_FROM_EMAIL
    );
  }

  /**
   * Fire-and-forget queue with exponential-backoff retry. Caller does not
   * await SMTP, so register/forgot-password/admin-invite return immediately
   * (~1ms instead of 1-3s waiting on Gmail). If all retries fail we log loudly
   * so ops can investigate; the user is never surfaced an SMTP error.
   */
  private static dispatch(
    label: string,
    message: { to: string; subject: string; text: string; html: string },
    successLog?: string
  ) {
    const attempt = async (n: number): Promise<void> => {
      try {
        await this.sendMail(message);
        logger.info(successLog ?? `${label} delivered to ${message.to}${n > 1 ? ` (retry ${n - 1})` : ''}`);
      } catch (err) {
        if (n >= 3) {
          logger.error(`${label} permanently failed for ${message.to} after ${n} attempts.`, err as Error);
          return;
        }
        const delay = 1000 * Math.pow(2, n - 1); // 1s, 2s
        setTimeout(() => void attempt(n + 1), delay);
      }
    };
    // Detached intentionally — don't block the HTTP request.
    void attempt(1);
  }

  private static async sendMail(message: { to: string; subject: string; text: string; html: string }) {
    const transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: {
        user: env.SMTP_USER,
        pass: this.normalizedSmtpPass(),
      },
    });

    await transporter.sendMail({
      from: {
        name: env.MAIL_FROM_NAME,
        address: env.MAIL_FROM_EMAIL || (env.SMTP_USER as string),
      },
      ...message,
    });
  }

  private static escapeHtml(value: string) {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

export default EmailService;
