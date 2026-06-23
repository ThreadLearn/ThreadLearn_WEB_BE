import { RefreshTokenEntity } from '../entities/refresh-token.entity';

/**
 * PORT: hợp đồng truy cập Refresh Token.
 *
 * Audit DEV1.0: behavior hiện tại lưu **raw token** → giữ `findByToken`/`deleteByToken`.
 * Các method `*ByTokenHash` để dành cho migration tương lai (chưa wire ở phase này).
 */
export interface IRefreshTokenRepository {
  findByToken(token: string): Promise<RefreshTokenEntity | null>;
  findByTokenHash(tokenHash: string): Promise<RefreshTokenEntity | null>;
  create(entity: RefreshTokenEntity): Promise<RefreshTokenEntity>;
  deleteByToken(token: string): Promise<void>;
  deleteByTokenHash(tokenHash: string): Promise<void>;
  deleteByUserId(userId: string): Promise<void>;
}

/** DI token cho `IRefreshTokenRepository`. */
export const REFRESH_TOKEN_REPOSITORY = Symbol('REFRESH_TOKEN_REPOSITORY');
