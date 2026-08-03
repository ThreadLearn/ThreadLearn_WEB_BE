import { UserEntity } from '../../domain/entities/user.entity';
import { IRefreshTokenRepository } from '../../domain/interfaces/refresh-token.repository';
import { ITokenService } from '../../domain/interfaces/token-service.port';
import { IUserRepository } from '../../domain/interfaces/user.repository';
import { RefreshTokenService } from './refresh-token.service';

describe('RefreshTokenService', () => {
  it('rotates tokens using the current persisted role instead of a stale token role', async () => {
    const user = UserEntity.fromPersistence({
      id: 'user-1', email: 'instructor@example.com', firstName: 'Thread', lastName: 'Instructor',
      passwordHash: 'hash', role: 'INSTRUCTOR', isActive: true, isVerified: true, tokenVersion: 3,
    });
    const users = { findById: jest.fn().mockResolvedValue(user) };
    const refreshTokens = {
      findByToken: jest.fn().mockResolvedValue({ isExpired: () => false }),
      deleteByToken: jest.fn(), create: jest.fn(),
    };
    const tokens = {
      verifyRefreshToken: jest.fn().mockReturnValue({
        id: 'user-1', email: 'instructor@example.com', role: 'STUDENT', tokenVersion: 3,
      }),
      signAccessToken: jest.fn().mockReturnValue('new-access'),
      signRefreshToken: jest.fn().mockReturnValue('new-refresh'),
    };
    const service = new RefreshTokenService(
      users as unknown as IUserRepository,
      refreshTokens as unknown as IRefreshTokenRepository,
      tokens as unknown as ITokenService,
    );

    await expect(service.execute({ refreshToken: 'old-refresh' })).resolves.toEqual({
      accessToken: 'new-access', refreshToken: 'new-refresh',
    });

    expect(tokens.signAccessToken).toHaveBeenCalledWith(expect.objectContaining({
      id: 'user-1', role: 'INSTRUCTOR', tokenVersion: 3,
    }));
    expect(tokens.signRefreshToken).toHaveBeenCalledWith(expect.objectContaining({ role: 'INSTRUCTOR' }));
  });
});
