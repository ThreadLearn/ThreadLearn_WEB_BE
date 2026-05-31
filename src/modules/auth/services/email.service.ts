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

    await this.sendMail({
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
    });

    logger.info(`Verification email sent to ${payload.email}`);
  }

  static async sendPasswordResetEmail(payload: PasswordResetEmailPayload) {
    if (!this.hasSmtpConfig()) {
      logger.info(`Mock password reset email sent to ${payload.email} for ${payload.firstName}: ${payload.resetUrl}`);
      return;
    }

    await this.sendMail({
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

    logger.info(`Password reset email sent to ${payload.email}`);
  }

  static async sendStudentInvitationEmail(payload: StudentInvitationEmailPayload) {
    logger.info(
      `Mock student invitation email sent to ${payload.email} for ${payload.firstName}. Temporary password: ${payload.temporaryPassword}`
    );
  }

  private static hasSmtpConfig() {
    return Boolean(env.SMTP_HOST && env.SMTP_PORT && env.SMTP_USER && env.SMTP_PASS);
  }

  private static async sendMail(message: { to: string; subject: string; text: string; html: string }) {
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
