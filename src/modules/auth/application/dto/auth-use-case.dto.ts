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
