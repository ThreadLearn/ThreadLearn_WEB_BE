import { UserRole } from '../../domain/value-objects/user-role.vo';

/**
 * DTO/result types cho Auth application use-cases (Register/Login).
 * THUẦN type — không import Mongoose/infrastructure/utils.
 *
 * Các result shape dưới đây được thiết kế để **giữ nguyên response hiện tại**
 * khi wire runtime ở phase sau (xem docs/CLAUDE_PROGRESS.md).
 */

/**
 * Safe user shape — mirror đúng `SafeUser` của `auth/utils/user-sanitizer.ts`
 * (whitelist field an toàn, KHÔNG có passwordHash/tokenHash/googleId).
 * Định nghĩa lại ở application để không phụ thuộc util legacy; presenter cuối
 * cùng sẽ chốt ở bước wire controller.
 */
export interface SafeAuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  role: UserRole;
  isVerified?: boolean;
  isActive?: boolean;
  lastLoginAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

// ----- Register -----

export interface RegisterUserInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

/**
 * Result của register — KHÔNG có token vì luồng hiện tại yêu cầu verify email
 * trước khi đăng nhập. Mirror `{ user, verificationRequired, message }`.
 */
export interface RegisterUserResult {
  user: SafeAuthUser;
  verificationRequired: true;
  message: string;
}

// ----- Login -----

export interface LoginUserInput {
  email: string;
  password: string;
  /** Optional metadata; chưa dùng ở phase này (chuẩn bị audit session sau). */
  userAgent?: string;
  ipAddress?: string;
}

/**
 * User shape thủ công của login hiện tại — CHỈ gồm `{ id, email, firstName,
 * lastName, role }` (KHÔNG có avatarUrl/isVerified/isActive). Giữ đúng, KHÔNG
 * "chuẩn hoá" sang SafeAuthUser.
 *
 * Caveat: login legacy trả `id = user._id` (ObjectId, JSON hoá thành string);
 * ở đây dùng `id: string` (đã JSON-equivalent qua wire). Xem docs.
 */
export interface LoginManualUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

export interface LoginUserResult {
  user: LoginManualUser;
  accessToken: string;
  refreshToken: string;
}

// ----- Verify email -----

export interface VerifyEmailInput {
  token: string;
}

/** Mirror `AuthService.verifyEmail` → `{ user: sanitizeUser }`. */
export interface VerifyEmailResult {
  user: SafeAuthUser;
}

// ----- Resend verification email -----

export interface ResendVerificationEmailInput {
  email: string;
}

/**
 * `AuthService.resendVerification` trả `true`; controller tự set message.
 * Giữ result tối thiểu `{ success: true }` (không đổi wire shape).
 */
export interface ResendVerificationEmailResult {
  success: true;
}

// ----- Forgot password -----

export interface ForgotPasswordInput {
  email: string;
}

/**
 * `AuthService.forgotPassword` luôn trả `true` (generic, chống enumeration);
 * controller trả message trung lập. Giữ result `{ success: true }`.
 */
export interface ForgotPasswordResult {
  success: true;
}

// ----- Reset password -----

export interface ResetPasswordInput {
  /** Raw reset token (sẽ được hash để tra cứu). */
  token: string;
  /** Mật khẩu mới (đã qua validator ở presentation; field tên `newPassword`). */
  newPassword: string;
}

/** `AuthService.resetPassword` trả `true`; controller tự set message. */
export interface ResetPasswordResult {
  success: true;
}

// ----- Refresh token -----

export interface RefreshTokenInput {
  /** Raw refresh token gửi lên từ client (field name only — KHÔNG log giá trị). */
  refreshToken: string;
}

/**
 * Mirror `AuthService.refresh` → `return tokens` = `{ accessToken, refreshToken }`.
 * KHÔNG có `user`/`message` trong data (controller tự set message bao ngoài).
 * `accessToken`/`refreshToken` ở đây là **tên field hợp lệ của result**, không phải log.
 */
export interface RefreshTokenResult {
  accessToken: string;
  refreshToken: string;
}

// ----- Logout -----

/**
 * `AuthService.logout(token)` chỉ nhận raw refresh token và `deleteOne({ token })`.
 * Mirror đúng: chỉ giữ `refreshToken` (KHÔNG logout-all theo userId, vì legacy không làm).
 */
export interface LogoutInput {
  refreshToken: string;
}

/**
 * `AuthService.logout` trả `true`; controller tự set message. Giữ result tối thiểu
 * `{ success: true }` (không đổi wire shape — controller chỉ trả `message`).
 */
export interface LogoutResult {
  success: true;
}

// ----- Get session -----

/**
 * Session endpoint hiện lấy user từ `JwtAuthGuard` + `@CurrentUser()`; controller
 * truyền `user.id` vào `AuthService.getSessionUser(userId)`. Use-case nhận `userId`
 * từ input — KHÔNG tự decode JWT (guard đã decode).
 */
export interface GetSessionInput {
  userId: string;
}

/** Mirror `AuthService.getSessionUser` → `sanitizeUser`; controller bọc `{ user }`. */
export interface GetSessionResult {
  user: SafeAuthUser;
}

// ----- Google login -----

/**
 * Google profile đã được xác thực (exchange code → userinfo) ở
 * strategy/adapter (`GOOGLE_OAUTH.verifyCallback`) TRƯỚC khi vào use-case.
 * Field map từ Google userinfo:
 * `sub→googleId`, `email`, `email_verified→emailVerified`, `given_name→firstName`,
 * `family_name→lastName`, `name`, `picture→picture`.
 * THUẦN type — không import Mongoose/infrastructure/utils. KHÔNG mang Google access token.
 */
export interface GoogleProfileInput {
  /** Google subject id (legacy: `profile.sub` → `user.googleId`). Bắt buộc. */
  googleId: string;
  email: string;
  /** Google `email_verified`; legacy reject khi `=== false`. */
  emailVerified?: boolean;
  /** Tương ứng Google `given_name`. */
  firstName?: string;
  /** Tương ứng Google `family_name`. */
  lastName?: string;
  /** Google `name` đầy đủ — legacy fallback parse firstName/lastName từ đây. */
  name?: string;
  /** Ảnh đại diện đã map sẵn (nếu có). */
  avatarUrl?: string;
  /** Google `picture` thô (legacy đọc field này). */
  picture?: string;
}

export interface GoogleLoginInput {
  profile: GoogleProfileInput;
  /** Optional metadata; chưa dùng ở phase này (chuẩn bị audit session sau). */
  userAgent?: string;
  ipAddress?: string;
}

/**
 * Mirror Google login response hiện tại (`AuthService.createAuthResponse`):
 * `{ user: sanitizeUser, accessToken, refreshToken }`.
 *
 * Lưu ý: KHÁC login email/password (login dùng object user **thủ công**) — Google
 * dùng `SafeAuthUser` đầy đủ (qua `sanitizeUser`). `accessToken`/`refreshToken` là
 * **tên field hợp lệ của result**, không phải log.
 */
export interface GoogleLoginResult {
  user: SafeAuthUser;
  accessToken: string;
  refreshToken: string;
}

// ----- Google auth URL (start) -----

/** Mirror `AuthService.getGoogleAuthorizationUrl()` → URL redirect tới Google. */
export interface GetGoogleAuthUrlResult {
  url: string;
}

// ----- Google callback (exchange code → login) -----

/**
 * Input callback Google. `code` do controller lấy từ query (đã validate). `error`
 * giữ để mirror nhánh Google trả lỗi (controller xử lý trước nên thường không vào đây).
 * KHÔNG mang Google access token / secret.
 */
export interface HandleGoogleCallbackInput {
  code: string;
  state?: string;
  error?: string;
}
