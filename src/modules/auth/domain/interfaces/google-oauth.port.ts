/**
 * PORT (tối thiểu) cho Google OAuth — chuẩn bị cho việc đưa flow Google ra adapter
 * ở phase sau. Audit DEV1.0: flow Google hiện xử lý inline trong service
 * (exchange code → get user info). Phase này CHỈ khai báo port tối thiểu,
 * KHÔNG wire vào flow thật.
 */
export interface IGoogleOAuth {
  /** Sinh URL authorize tới Google (tương đương getGoogleAuthorizationUrl hiện tại). */
  buildAuthUrl?(): string;
  /** Xử lý callback (exchange code + lấy profile). Shape input/output chốt ở phase wire. */
  verifyCallback?(input: unknown): Promise<unknown>;
}

/** DI token cho `IGoogleOAuth`. */
export const GOOGLE_OAUTH = Symbol('GOOGLE_OAUTH');
