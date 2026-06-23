/**
 * Payload tối thiểu để ký JWT (ngôn ngữ domain). Khớp với `{ id, email, role }`
 * mà auth đang ký. Adapter (infrastructure) sẽ map sang `JWTPayload` thật của
 * `src/utils/index.ts` khi hiện thực ở DEV1.2.
 */
export interface TokenPayload {
  id: string;
  email: string;
  role: string;
}

/**
 * PORT: dịch vụ token (JWT + random/hash token). KHÔNG implement JWT ở đây,
 * KHÔNG import jsonwebtoken, KHÔNG import src/utils. Adapter wrap các helper.
 */
export interface ITokenService {
  signAccessToken(payload: TokenPayload): string;
  signRefreshToken(payload: TokenPayload): string;
  verifyAccessToken(token: string): unknown;
  verifyRefreshToken(token: string): unknown;
  generateRandomToken(): string;
  hashToken(rawToken: string): string;
}

/** DI token cho `ITokenService`. */
export const TOKEN_SERVICE = Symbol('TOKEN_SERVICE');
