import { ACCOUNT_LOCKED_MESSAGE } from '../../auth-error-messages';
import { UserEntity } from '../../domain/entities/user.entity';
import { IPasswordHasher } from '../../domain/interfaces/password-hasher.port';
import { IRefreshTokenRepository } from '../../domain/interfaces/refresh-token.repository';
import { ITokenService } from '../../domain/interfaces/token-service.port';
import { IUserRepository } from '../../domain/interfaces/user.repository';
import { LoginUserService } from './login-user.service';

const baseUserProps = {
  id: 'user-1',
  email: 'user@example.com',
  passwordHash: 'hashed-password',
  firstName: 'Thread',
  lastName: 'Learner',
  role: 'STUDENT' as const,
  isVerified: true,
  isActive: true,
};

function makeUser(overrides: Partial<ReturnType<UserEntity['toProps']>> = {}) {
  return UserEntity.fromPersistence({
    ...baseUserProps,
    ...overrides,
  });
}

function makeDeps() {
  const userRepo = {
    findByEmail: jest.fn<Promise<UserEntity | null>, [string]>(),
    updateLoginSecurityState: jest.fn(async (user) => user),
  };
  const passwordHasher = {
    compare: jest.fn<Promise<boolean>, [string, string]>(),
  };
  const tokenService = {
    signAccessToken: jest.fn((_payload) => 'access-token'),
    signRefreshToken: jest.fn((_payload) => 'refresh-token'),
  };
  const refreshTokenRepo = {
    create: jest.fn(async (token) => token),
  };

  const service = new LoginUserService(
    userRepo as unknown as IUserRepository,
    passwordHasher as unknown as IPasswordHasher,
    tokenService as unknown as ITokenService,
    refreshTokenRepo as unknown as IRefreshTokenRepository,
  );

  return { service, userRepo, passwordHasher, tokenService, refreshTokenRepo };
}

describe('LoginUserService', () => {
  it('returns 403 with a clear locked message for an admin-locked user', async () => {
    const deps = makeDeps();
    deps.userRepo.findByEmail.mockResolvedValue(makeUser({ lockedAt: new Date() }));
    deps.passwordHasher.compare.mockResolvedValue(true);

    await expect(
      deps.service.execute({ email: 'user@example.com', password: 'correct-password' }),
    ).rejects.toMatchObject({
      statusCode: 403,
      message: ACCOUNT_LOCKED_MESSAGE,
    });

    expect(deps.passwordHasher.compare).toHaveBeenCalledWith('correct-password', 'hashed-password');
    expect(deps.refreshTokenRepo.create).not.toHaveBeenCalled();
  });

  it('returns 403 with a clear locked message for an inactive user', async () => {
    const deps = makeDeps();
    deps.userRepo.findByEmail.mockResolvedValue(makeUser({ isActive: false }));
    deps.passwordHasher.compare.mockResolvedValue(true);

    await expect(
      deps.service.execute({ email: 'user@example.com', password: 'correct-password' }),
    ).rejects.toMatchObject({
      statusCode: 403,
      message: ACCOUNT_LOCKED_MESSAGE,
    });

    expect(deps.refreshTokenRepo.create).not.toHaveBeenCalled();
  });

  it('keeps wrong passwords on the generic invalid credentials message', async () => {
    const deps = makeDeps();
    deps.userRepo.findByEmail.mockResolvedValue(makeUser());
    deps.passwordHasher.compare.mockResolvedValue(false);

    await expect(
      deps.service.execute({ email: 'user@example.com', password: 'wrong-password' }),
    ).rejects.toMatchObject({
      statusCode: 400,
      message: 'Invalid credentials.',
    });

    expect(deps.userRepo.updateLoginSecurityState).toHaveBeenCalledTimes(1);
    expect(deps.refreshTokenRepo.create).not.toHaveBeenCalled();
  });

  it('returns 403 with the verify-email message for an unverified user', async () => {
    const deps = makeDeps();
    deps.userRepo.findByEmail.mockResolvedValue(makeUser({ isVerified: false }));
    deps.passwordHasher.compare.mockResolvedValue(true);

    await expect(
      deps.service.execute({ email: 'user@example.com', password: 'correct-password' }),
    ).rejects.toMatchObject({
      statusCode: 403,
      message: 'Please verify your email before logging in.',
    });

    expect(deps.refreshTokenRepo.create).not.toHaveBeenCalled();
  });

  it('signs both tokens with the persisted instructor role', async () => {
    const deps = makeDeps();
    deps.userRepo.findByEmail.mockResolvedValue(makeUser({ role: 'INSTRUCTOR' }));
    deps.passwordHasher.compare.mockResolvedValue(true);

    await deps.service.execute({ email: 'user@example.com', password: 'correct-password' });

    expect(deps.tokenService.signAccessToken).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'INSTRUCTOR' }),
    );
    expect(deps.tokenService.signRefreshToken).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'INSTRUCTOR' }),
    );
  });
});
