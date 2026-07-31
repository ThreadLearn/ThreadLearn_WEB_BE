import { UserEntity } from '../../domain/entities/user.entity';
import { IRefreshTokenRepository } from '../../domain/interfaces/refresh-token.repository';
import { ITokenService } from '../../domain/interfaces/token-service.port';
import { IUserRepository } from '../../domain/interfaces/user.repository';
import { LogoutService } from './logout.service';

describe('LogoutService token revocation', () => {
  const makeUser = (tokenVersion = 0) => UserEntity.fromPersistence({
    id: 'user-1', email: 'learner@example.test', role: 'STUDENT',
    isVerified: true, isActive: true, tokenVersion,
  });

  it('increments tokenVersion before removing a valid refresh token', async () => {
    const user = makeUser();
    const refreshTokenRepo = { deleteByToken: jest.fn() };
    const tokenService = { verifyRefreshToken: jest.fn(() => ({ id: user.id })) };
    const userRepo = { findById: jest.fn(async () => user), update: jest.fn(async (value) => value) };
    const service = new LogoutService(
      refreshTokenRepo as unknown as IRefreshTokenRepository,
      tokenService as unknown as ITokenService,
      userRepo as unknown as IUserRepository,
    );

    await expect(service.execute({ refreshToken: 'valid-refresh-token' })).resolves.toEqual({ success: true });
    expect(userRepo.update).toHaveBeenCalledWith(expect.objectContaining({}));
    expect(user.toProps().tokenVersion).toBe(1);
    expect(refreshTokenRepo.deleteByToken).toHaveBeenCalledWith('valid-refresh-token');
  });

  it('remains idempotent for an invalid refresh token', async () => {
    const refreshTokenRepo = { deleteByToken: jest.fn() };
    const tokenService = { verifyRefreshToken: jest.fn(() => { throw new Error('invalid'); }) };
    const userRepo = { findById: jest.fn(), update: jest.fn() };
    const service = new LogoutService(
      refreshTokenRepo as unknown as IRefreshTokenRepository,
      tokenService as unknown as ITokenService,
      userRepo as unknown as IUserRepository,
    );

    await expect(service.execute({ refreshToken: 'invalid-refresh-token' })).resolves.toEqual({ success: true });
    expect(userRepo.update).not.toHaveBeenCalled();
    expect(refreshTokenRepo.deleteByToken).toHaveBeenCalledWith('invalid-refresh-token');
  });
});
