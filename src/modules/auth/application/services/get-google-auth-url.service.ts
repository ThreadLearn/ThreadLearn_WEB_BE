import { Inject, Injectable } from '@nestjs/common';
import { GOOGLE_OAUTH, IGoogleOAuth } from '../../domain/interfaces/google-oauth.port';
import { GetGoogleAuthUrlResult } from '../dto/auth-use-case.dto';

/**
 * UC02/UC05 — Build Google authorization URL (route `GET /auth/google`).
 * Mirror `AuthService.getGoogleAuthorizationUrl()`: trả URL để controller redirect.
 *
 * Chỉ điều phối qua port `GOOGLE_OAUTH` (adapter giữ env→URL ở infrastructure).
 * KHÔNG import infrastructure/env/utils. KHÔNG log URL (có thể chứa client_id).
 * Misconfig Google → adapter ném Error (mirror legacy chặn khi thiếu config).
 */
@Injectable()
export class GetGoogleAuthUrlService {
  constructor(@Inject(GOOGLE_OAUTH) private readonly googleOAuth: IGoogleOAuth) {}

  execute(): GetGoogleAuthUrlResult {
    return { url: this.googleOAuth.buildAuthUrl() };
  }
}
