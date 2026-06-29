/**
 * PORT cho Google OAuth. DEV1.4C-4 wire flow Google ra adapter:
 * `buildAuthUrl()` (start) + `verifyCallback()` (exchange code → profile thô).
 *
 * Type thuần domain — KHÔNG import NestJS/Mongoose/infrastructure/env/utils.
 * Adapter (`infrastructure/services/google-oauth.service.ts`) hiện thực; KHÔNG
 * tạo/link user và KHÔNG đụng DB (đó là việc của `GoogleLoginService`).
 */

/** Profile thô từ Google userinfo (giữ nguyên tên field Google). KHÔNG mang access token. */
export interface GoogleOAuthProfile {
  sub?: string;
  email?: string;
  email_verified?: boolean;
  given_name?: string;
  family_name?: string;
  name?: string;
  picture?: string;
}

export interface IGoogleOAuth {
  /** Sinh URL authorize tới Google (mirror `getGoogleAuthorizationUrl` legacy). */
  buildAuthUrl(): string;
  /** Exchange code + lấy profile thô (mirror exchange/userinfo legacy). */
  verifyCallback(input: { code: string }): Promise<GoogleOAuthProfile>;
}

/** DI token cho `IGoogleOAuth`. */
export const GOOGLE_OAUTH = Symbol('GOOGLE_OAUTH');
