import { Injectable } from '@nestjs/common';
import crypto from 'crypto';
import {
  signAccessToken as signAccessTokenUtil,
  signRefreshToken as signRefreshTokenUtil,
  verifyAccessToken as verifyAccessTokenUtil,
  verifyRefreshToken as verifyRefreshTokenUtil,
} from '../../../../utils';
import { JWTPayload } from '../../../../types';
import { ITokenService, TokenPayload } from '../../domain/interfaces/token-service.port';

/**
 * Adapter cho `ITokenService` — wrap JWT helper ở `src/utils/index.ts`.
 *
 * `TokenPayload {id,email,role:string}` (domain) map sang `JWTPayload`
 * ({id,email,role:'STUDENT'|'ADMIN'}) — payload `{ id, email, role }` đúng với
 * payload AuthService đang ký hiện tại (xem `AuthService.generateTokens`).
 *
 * `generateRandomToken`/`hashToken` giữ ĐÚNG behavior raw-token hiện tại của
 * AuthService (`crypto.randomBytes(32).hex` + sha256), KHÔNG dùng
 * `utils.generateRandomToken` (format khác) để không đổi semantics token.
 * KHÔNG log token.
 */
@Injectable()
export class JwtTokenService implements ITokenService {
  private toJwtPayload(payload: TokenPayload): JWTPayload {
    return {
      id: payload.id,
      email: payload.email,
      role: payload.role as JWTPayload['role'],
      tokenVersion: payload.tokenVersion,
    };
  }

  signAccessToken(payload: TokenPayload): string {
    return signAccessTokenUtil(this.toJwtPayload(payload));
  }

  signRefreshToken(payload: TokenPayload): string {
    return signRefreshTokenUtil(this.toJwtPayload(payload));
  }

  verifyAccessToken(token: string): unknown {
    return verifyAccessTokenUtil(token);
  }

  verifyRefreshToken(token: string): unknown {
    return verifyRefreshTokenUtil(token);
  }

  generateRandomToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  hashToken(rawToken: string): string {
    return crypto.createHash('sha256').update(rawToken).digest('hex');
  }

  generateNumericOtp(): string {
    return crypto.randomInt(100000, 1000000).toString();
  }

  hashVerificationCode(userId: string, code: string): string {
    return crypto.createHash('sha256').update(`${userId}:${code}`).digest('hex');
  }
}
