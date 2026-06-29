import { Inject, Injectable } from '@nestjs/common';
import { GOOGLE_OAUTH, IGoogleOAuth } from '../../domain/interfaces/google-oauth.port';
import { GoogleLoginService } from './google-login.service';
import {
  GoogleLoginResult,
  GoogleProfileInput,
  HandleGoogleCallbackInput,
} from '../dto/auth-use-case.dto';

/**
 * UC05 — Handle Google OAuth callback (route `GET /auth/google/callback`).
 * Mirror `AuthService.loginWithGoogleCode(code)`:
 *
 * 1. Exchange code → profile thô qua port `GOOGLE_OAUTH.verifyCallback`.
 * 2. Map field Google (`sub→googleId`, `email_verified→emailVerified`,
 *    `given_name/family_name→firstName/lastName`, `picture`) → `GoogleProfileInput`.
 * 3. Uỷ thác toàn bộ xử lý user (validate email/sub/verified, tìm/tạo/link user,
 *    ký token, lưu refresh raw, UserStats parity) cho `GoogleLoginService`.
 * 4. Trả `GoogleLoginResult` (`{ user: SafeAuthUser, accessToken, refreshToken }`).
 *
 * Chỉ điều phối qua port + use-case. KHÔNG import infrastructure/env/utils.
 * KHÔNG log code/token/profile. Controller lo redirect (presentation concern).
 */
@Injectable()
export class HandleGoogleCallbackService {
  constructor(
    @Inject(GOOGLE_OAUTH) private readonly googleOAuth: IGoogleOAuth,
    private readonly googleLoginService: GoogleLoginService,
  ) {}

  async execute(input: HandleGoogleCallbackInput): Promise<GoogleLoginResult> {
    const profile = await this.googleOAuth.verifyCallback({ code: input.code });

    const mapped: GoogleProfileInput = {
      googleId: profile.sub ?? '',
      email: profile.email ?? '',
      emailVerified: profile.email_verified,
      firstName: profile.given_name,
      lastName: profile.family_name,
      name: profile.name,
      picture: profile.picture,
    };

    return this.googleLoginService.execute({ profile: mapped });
  }
}
