import { RegisterUserService } from './register-user.service';
import { ResendVerificationEmailService } from './resend-verification-email.service';
import { VerifyEmailService } from './verify-email.service';
import { UserEntity } from '../../domain/entities/user.entity';
import { IEmailSender } from '../../domain/interfaces/email-sender.port';
import { IPasswordHasher } from '../../domain/interfaces/password-hasher.port';
import { ITokenService } from '../../domain/interfaces/token-service.port';
import { IUserRepository } from '../../domain/interfaces/user.repository';

const baseUserProps = {
  id: 'user-1',
  email: 'user@example.com',
  passwordHash: 'hashed-password',
  firstName: 'Thread',
  lastName: 'Learner',
  role: 'STUDENT' as const,
  isVerified: false,
  isActive: true,
};

function makeUser(overrides: Partial<ReturnType<UserEntity['toProps']>> = {}) {
  return UserEntity.fromPersistence({
    ...baseUserProps,
    ...overrides,
  });
}

function makeDeps() {
  const userRepo: jest.Mocked<Pick<
    IUserRepository,
    'findByEmail' | 'create' | 'updateEmailVerificationState'
  >> = {
    findByEmail: jest.fn(),
    create: jest.fn(),
    updateEmailVerificationState: jest.fn(async (user) => user),
  };
  const passwordHasher: jest.Mocked<Pick<IPasswordHasher, 'hash'>> = {
    hash: jest.fn(async (_password: string) => 'hashed-password'),
  };
  const tokenService: jest.Mocked<Pick<ITokenService, 'generateNumericOtp' | 'hashVerificationCode'>> = {
    generateNumericOtp: jest.fn(() => '123456'),
    hashVerificationCode: jest.fn((userId, code) => `hash:${userId}:${code}`),
  };
  const emailSender: jest.Mocked<Pick<IEmailSender, 'sendVerificationEmail'>> = {
    sendVerificationEmail: jest.fn(async (_input) => undefined),
  };
  const userRegisteredHandler = {
    onUserRegistered: jest.fn(async () => undefined),
  };

  return { userRepo, passwordHasher, tokenService, emailSender, userRegisteredHandler };
}

describe('email verification OTP use-cases', () => {
  it('register stores only OTP hash, sends the OTP email, and does not return the raw code', async () => {
    const deps = makeDeps();
    deps.userRepo.findByEmail.mockResolvedValue(null);
    deps.userRepo.create.mockResolvedValue(makeUser());

    const service = new RegisterUserService(
      deps.userRepo as unknown as IUserRepository,
      deps.passwordHasher as unknown as IPasswordHasher,
      deps.tokenService as unknown as ITokenService,
      deps.emailSender as unknown as IEmailSender,
      deps.userRegisteredHandler as any,
    );

    const result = await service.execute({
      email: 'USER@example.com',
      password: 'secret123',
      firstName: 'Thread',
      lastName: 'Learner',
    });

    expect(deps.emailSender.sendVerificationEmail).toHaveBeenCalledWith({
      to: 'user@example.com',
      code: '123456',
      firstName: 'Thread',
    });
    expect(JSON.stringify(result)).not.toContain('123456');

    const savedUser = deps.userRepo.updateEmailVerificationState.mock.calls[0][0];
    expect(savedUser.toProps()).toMatchObject({
      emailVerificationCodeHash: 'hash:user-1:123456',
      emailVerificationCodeAttempts: 0,
    });
    expect(savedUser.toProps().emailVerificationCodeExpiresAt).toBeInstanceOf(Date);
  });

  it('verifies a valid code and clears OTP fields', async () => {
    const deps = makeDeps();
    deps.userRepo.findByEmail.mockResolvedValue(
      makeUser({
        emailVerificationCodeHash: 'hash:user-1:123456',
        emailVerificationCodeExpiresAt: new Date(Date.now() + 60_000),
        emailVerificationCodeAttempts: 1,
        emailVerificationLastSentAt: new Date(),
      }),
    );
    const service = new VerifyEmailService(
      deps.userRepo as unknown as IUserRepository,
      deps.tokenService as unknown as ITokenService,
    );

    const result = await service.execute({ email: 'USER@example.com', code: '123456' });

    expect(result.user.isVerified).toBe(true);
    const savedUser = deps.userRepo.updateEmailVerificationState.mock.calls[0][0];
    expect(savedUser.toProps()).toMatchObject({ isVerified: true });
    expect(savedUser.toProps().emailVerificationCodeHash).toBeUndefined();
    expect(savedUser.toProps().emailVerificationCodeExpiresAt).toBeUndefined();
    expect(savedUser.toProps().emailVerificationCodeAttempts).toBeUndefined();
  });

  it('increments attempts for an invalid code', async () => {
    const deps = makeDeps();
    deps.userRepo.findByEmail.mockResolvedValue(
      makeUser({
        emailVerificationCodeHash: 'hash:user-1:123456',
        emailVerificationCodeExpiresAt: new Date(Date.now() + 60_000),
        emailVerificationCodeAttempts: 1,
      }),
    );
    const service = new VerifyEmailService(
      deps.userRepo as unknown as IUserRepository,
      deps.tokenService as unknown as ITokenService,
    );

    await expect(service.execute({ email: 'user@example.com', code: '000000' })).rejects.toThrow(
      'Verification code is invalid.',
    );

    const savedUser = deps.userRepo.updateEmailVerificationState.mock.calls[0][0];
    expect(savedUser.toProps().emailVerificationCodeAttempts).toBe(2);
  });

  it('rejects expired codes without incrementing attempts', async () => {
    const deps = makeDeps();
    deps.userRepo.findByEmail.mockResolvedValue(
      makeUser({
        emailVerificationCodeHash: 'hash:user-1:123456',
        emailVerificationCodeExpiresAt: new Date(Date.now() - 60_000),
        emailVerificationCodeAttempts: 1,
      }),
    );
    const service = new VerifyEmailService(
      deps.userRepo as unknown as IUserRepository,
      deps.tokenService as unknown as ITokenService,
    );

    await expect(service.execute({ email: 'user@example.com', code: '123456' })).rejects.toThrow(
      'Verification code is invalid or expired.',
    );
    expect(deps.userRepo.updateEmailVerificationState).not.toHaveBeenCalled();
  });

  it('resend creates a fresh OTP and replaces the stored hash', async () => {
    const deps = makeDeps();
    deps.tokenService.generateNumericOtp.mockReturnValue('654321');
    deps.userRepo.findByEmail.mockResolvedValue(
      makeUser({
        emailVerificationCodeHash: 'old-hash',
        emailVerificationCodeExpiresAt: new Date(Date.now() + 60_000),
        emailVerificationCodeAttempts: 3,
      }),
    );
    const service = new ResendVerificationEmailService(
      deps.userRepo as unknown as IUserRepository,
      deps.tokenService as unknown as ITokenService,
      deps.emailSender as unknown as IEmailSender,
    );

    await service.execute({ email: 'user@example.com' });

    expect(deps.emailSender.sendVerificationEmail).toHaveBeenCalledWith({
      to: 'user@example.com',
      code: '654321',
      firstName: 'Thread',
    });
    const savedUser = deps.userRepo.updateEmailVerificationState.mock.calls[0][0];
    expect(savedUser.toProps()).toMatchObject({
      emailVerificationCodeHash: 'hash:user-1:654321',
      emailVerificationCodeAttempts: 0,
    });
  });

  it('returns already verified users without requiring an OTP', async () => {
    const deps = makeDeps();
    deps.userRepo.findByEmail.mockResolvedValue(makeUser({ isVerified: true }));
    const service = new VerifyEmailService(
      deps.userRepo as unknown as IUserRepository,
      deps.tokenService as unknown as ITokenService,
    );

    const result = await service.execute({ email: 'user@example.com', code: '123456' });

    expect(result.user.isVerified).toBe(true);
    expect(deps.userRepo.updateEmailVerificationState).not.toHaveBeenCalled();
  });
});
