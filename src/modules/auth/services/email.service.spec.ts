jest.mock('../../../configs/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('../../../configs/env', () => ({
  env: {
    SMTP_HOST: '',
    SMTP_PORT: undefined,
    SMTP_USER: '',
    SMTP_PASS: '',
    SMTP_SECURE: false,
    MAIL_FROM_NAME: 'ThreadLearn',
    MAIL_FROM_EMAIL: 'noreply@example.com',
  },
}));

import { logger } from '../../../configs/logger';
import { EmailService } from './email.service';

describe('EmailService sensitive logging', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not log verification OTP codes in mock mode', async () => {
    await EmailService.sendVerificationEmail({
      email: 'user@example.com',
      firstName: 'Thread',
      code: '123456',
    });

    expect(logger.info).toHaveBeenCalledWith('Mock verification email sent to user@example.com for Thread.');
    expect(JSON.stringify((logger.info as jest.Mock).mock.calls)).not.toContain('123456');
  });

  it('does not log password reset tokens in mock mode', async () => {
    await EmailService.sendPasswordResetEmail({
      email: 'user@example.com',
      firstName: 'Thread',
      resetUrl: 'https://app.example/reset-password?token=secret-token',
    });

    expect(JSON.stringify((logger.info as jest.Mock).mock.calls)).not.toContain('secret-token');
  });
});
