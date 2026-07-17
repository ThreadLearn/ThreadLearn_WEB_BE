import jwt, { JwtPayload } from 'jsonwebtoken';

function tokenDurationSeconds(token: string): number {
  const decoded = jwt.decode(token) as JwtPayload | null;

  expect(decoded).toEqual(
    expect.objectContaining({
      iat: expect.any(Number),
      exp: expect.any(Number),
    }),
  );

  return (decoded!.exp as number) - (decoded!.iat as number);
}

describe('JWT token expiry configuration', () => {
  afterEach(() => {
    jest.resetModules();
    jest.dontMock('dotenv');
    jest.dontMock('../configs/env');
  });

  it('defaults JWT lifetimes to 30m access and 7d refresh', async () => {
    const originalEnv = process.env;
    const dotenvConfig = jest.fn();

    jest.doMock('dotenv', () => ({
      __esModule: true,
      default: { config: dotenvConfig },
      config: dotenvConfig,
    }));

    process.env = {
      ...originalEnv,
      DATABASE_URL: 'mongodb://localhost:27017/threadlearn-test',
      JWT_ACCESS_SECRET: 'test-access-secret',
      JWT_REFRESH_SECRET: 'test-refresh-secret',
    };
    delete process.env.JWT_ACCESS_EXPIRES_IN;
    delete process.env.JWT_REFRESH_EXPIRES_IN;

    try {
      await jest.isolateModulesAsync(async () => {
        const { env } = await import('../configs/env');

        expect(env.JWT_ACCESS_EXPIRES_IN).toBe('30m');
        expect(env.JWT_REFRESH_EXPIRES_IN).toBe('7d');
      });
    } finally {
      process.env = originalEnv;
    }
  });

  it('signs JWTs with access exp-iat 1800s and refresh exp-iat 604800s', async () => {
    jest.doMock('../configs/env', () => ({
      env: {
        JWT_ACCESS_SECRET: 'test-access-secret',
        JWT_REFRESH_SECRET: 'test-refresh-secret',
        JWT_ACCESS_EXPIRES_IN: '30m',
        JWT_REFRESH_EXPIRES_IN: '7d',
      },
    }));

    await jest.isolateModulesAsync(async () => {
      const { signAccessToken, signRefreshToken } = await import('./index');
      const payload = { id: 'user-1', email: 'user@example.com', role: 'STUDENT' as const };

      const accessToken = signAccessToken(payload);
      const refreshToken = signRefreshToken(payload);

      expect(tokenDurationSeconds(accessToken)).toBe(1800);
      expect(tokenDurationSeconds(refreshToken)).toBe(604800);
    });
  });
});
