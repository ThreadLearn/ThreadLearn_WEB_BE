import nodemailer from 'nodemailer';
import { logger } from '../../../configs/logger';
import { env } from '../../../configs/env';

type VerificationEmailPayload = {
  email: string;
  firstName: string;
  code: string;
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

type LearningPlanReminderEmailPayload = {
  email: string;
  firstName: string;
  sessionMinutes: number;
  learningPlanUrl: string;
  atRiskGoalCount: number;
  behindGoalCount: number;
};

/**
 * Legacy SMTP implementation (nodemailer). DEV1.5A — KHÔNG deprecated-for-removal:
 * vẫn là implementation thật phía sau port `EMAIL_SENDER`. `SmtpEmailSenderService`
 * (adapter EmailSender) wrap `sendVerificationEmail`/`sendPasswordResetEmail` tĩnh;
 * `AdminService` còn gọi trực tiếp `sendStudentInvitationEmail` (chưa có port riêng).
 *
 * Giữ nguyên SMTP/mock/env-detection/log/link behavior. Khi cần, các caller sẽ dần
 * chuyển sang inject port `EMAIL_SENDER` thay vì gọi static — cleanup ở phase sau.
 */
export class EmailService {
  static async sendVerificationEmail(payload: VerificationEmailPayload) {
    if (!this.hasSmtpConfig()) {
      logger.info(`Mock verification email sent to ${payload.email} for ${payload.firstName}.`);
      return;
    }

    this.dispatch('Verification email', {
      to: payload.email,
      subject: 'Your ThreadLearn verification code',
      text: [
        `Hi ${payload.firstName},`,
        '',
        'Your ThreadLearn verification code is:',
        payload.code,
        '',
        'This code will expire in 10 minutes. If you did not create a ThreadLearn account, you can ignore this email.',
      ].join('\n'),
      html: `
        <p>Hi ${this.escapeHtml(payload.firstName)},</p>
        <p>Your ThreadLearn verification code is:</p>
        <p style="font-size:24px;font-weight:700;letter-spacing:4px;">${this.escapeHtml(payload.code)}</p>
        <p>This code will expire in 10 minutes. If you did not create a ThreadLearn account, you can ignore this email.</p>
      `,
    });
  }

  static async sendPasswordResetEmail(payload: PasswordResetEmailPayload) {
    if (!this.hasSmtpConfig()) {
      logger.info(`Mock password reset email sent to ${payload.email} for ${payload.firstName}.`);
      return;
    }

    this.dispatch('Password reset email', {
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
    });
  }

  static async sendStudentInvitationEmail(payload: StudentInvitationEmailPayload) {
    if (!this.hasSmtpConfig()) {
      logger.info(
        `Mock student invitation email sent to ${payload.email} for ${payload.firstName}.`
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

  static async sendLearningPlanReminderEmail(payload: LearningPlanReminderEmailPayload) {
    if (!this.hasSmtpConfig()) {
      logger.info(
        `Mock learning-plan reminder email sent to ${payload.email} for ${payload.firstName}.`
      );
      return;
    }

    const goalSummary = [
      payload.behindGoalCount > 0
        ? `${payload.behindGoalCount} course target${payload.behindGoalCount === 1 ? '' : 's'} past due`
        : '',
      payload.atRiskGoalCount > 0
        ? `${payload.atRiskGoalCount} course target${payload.atRiskGoalCount === 1 ? '' : 's'} need attention`
        : '',
    ].filter(Boolean);
    const attentionMessage = goalSummary.length
      ? ` You also have ${goalSummary.join(' and ')}.`
      : '';

    this.dispatch('Learning-plan reminder email', {
      to: payload.email,
      subject: 'Your ThreadLearn study reminder',
      text: [
        `Hi ${payload.firstName},`,
        '',
        `Set aside about ${payload.sessionMinutes} minutes for your planned study session.${attentionMessage}`,
        '',
        `Open your study plan: ${payload.learningPlanUrl}`,
      ].join('\n'),
      html: `
        <p>Hi ${this.escapeHtml(payload.firstName)},</p>
        <p>Set aside about <strong>${payload.sessionMinutes} minutes</strong> for your planned study session.${this.escapeHtml(attentionMessage)}</p>
        <p><a href="${this.escapeHtml(payload.learningPlanUrl)}">Open your study plan</a></p>
      `,
    });
  }

  private static hasSmtpConfig() {
    return Boolean(env.SMTP_HOST && env.SMTP_PORT && env.SMTP_USER && env.SMTP_PASS);
  }

  /**
   * Fire-and-forget queue with exponential-backoff retry. Caller does not
   * await SMTP, so register/forgot-password/admin-invite return immediately
   * (~1ms instead of 1-3s waiting on Gmail). If all retries fail we log loudly
   * so ops can investigate; the user is never surfaced an SMTP error.
   */
  private static dispatch(
    label: string,
    message: { to: string; subject: string; text: string; html: string }
  ) {
    const attempt = async (n: number): Promise<void> => {
      try {
        await this.sendMail(message);
        logger.info(`${label} delivered to ${message.to}${n > 1 ? ` (retry ${n - 1})` : ''}`);
      } catch (err) {
        if (n >= 3) {
          logger.error(
            `${label} permanently failed for ${message.to} after ${n} attempts.`,
            err as Error
          );
          return;
        }
        const delay = 1000 * Math.pow(2, n - 1); // 1s, 2s
        setTimeout(() => void attempt(n + 1), delay);
      }
    };
    // Detached intentionally — don't block the HTTP request.
    void attempt(1);
  }

  private static async sendMail(message: {
    to: string;
    subject: string;
    text: string;
    html: string;
  }) {
    const transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
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
