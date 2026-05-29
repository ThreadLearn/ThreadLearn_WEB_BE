import { logger } from '../../../configs/logger';

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

export class EmailService {
  static async sendVerificationEmail(payload: VerificationEmailPayload) {
    logger.info(
      `Mock verification email sent to ${payload.email} for ${payload.firstName}: ${payload.verificationUrl}`
    );
  }

  static async sendPasswordResetEmail(payload: PasswordResetEmailPayload) {
    logger.info(`Mock password reset email sent to ${payload.email} for ${payload.firstName}: ${payload.resetUrl}`);
  }
}

export default EmailService;
