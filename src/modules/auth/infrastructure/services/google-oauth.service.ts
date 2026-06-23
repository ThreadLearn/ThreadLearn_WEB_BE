import { Injectable } from '@nestjs/common';
import { env } from '../../../../configs/env';
import { IGoogleOAuth } from '../../domain/interfaces/google-oauth.port';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';

/** Profile thô trả về từ Google userinfo (không gồm logic tạo/link user). */
export interface GoogleProfile {
  sub?: string;
  email?: string;
  email_verified?: boolean;
  given_name?: string;
  family_name?: string;
  name?: string;
  picture?: string;
}

/**
 * Adapter cho `IGoogleOAuth`. Chuẩn bị tách Google flow ra khỏi AuthService
 * mà KHÔNG đổi runtime hiện tại (AuthService vẫn tự xử lý Google).
 *
 * - `buildAuthUrl()`: thuần env → URL, mirror `AuthService.getGoogleAuthorizationUrl`.
 * - `verifyCallback(code)`: exchange code → access_token → userinfo, trả PROFILE thô.
 *   CAVEAT: KHÔNG tạo/link user (đó là việc của use-case ở DEV1.3), KHÔNG đụng DB.
 *   Adapter KHÔNG log token/secret. Không thêm dependency mới (dùng global `fetch`).
 */
@Injectable()
export class GoogleOAuthService implements IGoogleOAuth {
  private assertConfigured(): void {
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
      throw new Error('Google OAuth is not configured.');
    }
  }

  private getCallbackUrl(): string {
    return env.GOOGLE_CALLBACK_URL || `http://localhost:${env.PORT}/api/v1/auth/google/callback`;
  }

  buildAuthUrl(): string {
    this.assertConfigured();
    const params = new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID as string,
      redirect_uri: this.getCallbackUrl(),
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'select_account',
    });
    return `${GOOGLE_AUTH_URL}?${params.toString()}`;
  }

  async verifyCallback(input: unknown): Promise<GoogleProfile> {
    this.assertConfigured();
    const code = typeof input === 'string' ? input : (input as { code?: string })?.code;
    if (!code) {
      throw new Error('Google OAuth authorization code is missing.');
    }

    const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: env.GOOGLE_CLIENT_ID as string,
        client_secret: env.GOOGLE_CLIENT_SECRET as string,
        redirect_uri: this.getCallbackUrl(),
        grant_type: 'authorization_code',
      }),
    });
    if (!tokenRes.ok) {
      throw new Error('Google OAuth token exchange failed.');
    }

    const tokens = (await tokenRes.json()) as { access_token?: string };
    if (!tokens.access_token) {
      throw new Error('Google OAuth did not return an access token.');
    }

    const profileRes = await fetch(GOOGLE_USERINFO_URL, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    if (!profileRes.ok) {
      throw new Error('Failed to retrieve Google profile.');
    }

    return (await profileRes.json()) as GoogleProfile;
  }
}
