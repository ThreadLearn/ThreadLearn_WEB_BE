import { logger } from '../../../configs/logger';

type VerificationEmailPayload = {
  email: string;
  firstName: string;
  verificationUrl: string;
};

export class EmailService {
  static async sendVerificationEmail(payload: VerificationEmailPayload) {
    logger.info(
      `Mock verification email sent to ${payload.email} for ${payload.firstName}: ${payload.verificationUrl}`
    );
  }
}

export default EmailService;
