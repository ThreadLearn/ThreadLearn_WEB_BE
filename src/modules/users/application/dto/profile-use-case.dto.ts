import { AvatarUploadFile } from '../../domain/interfaces/avatar-storage.port';
import { UserProfileStats } from '../../domain/interfaces/user-stats-reader.port';

/**
 * DTO/result types cho UC09 (Profile / Avatar). Thuần application — KHÔNG import
 * Mongoose/model/schema/infrastructure/`src/utils`. `AvatarUploadFile` được phép
 * import từ users domain port vì là type thuần (không phụ thuộc Express/Multer).
 *
 * Mọi result được thiết kế để khớp 1-1 với `data` legacy hiện tại để khi migrate
 * controller (DEV1.6D) chỉ cần `ApiResponse.success({ data: result })` — KHÔNG đổi shape.
 */

/**
 * Whitelist field an toàn — mirror ĐÚNG `sanitizeUser` (auth/utils/user-sanitizer):
 * id, email, firstName, lastName, avatarUrl, role, isVerified, isActive,
 * lastLoginAt, createdAt, updatedAt, entitlement. KHÔNG có passwordHash/googleId/githubId/lockedAt.
 */
export type ProfileSafeUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  role: 'STUDENT' | 'ADMIN';
  isVerified?: boolean;
  isActive?: boolean;
  planType: 'FREE' | 'PREMIUM';
  subscriptionExpiresAt?: Date;
  subscriptionFeatures: string[];
  lastLoginAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
};

/**
 * Stats trả ở GET profile. Mirror legacy: khi có bản ghi UserStats trả nguyên doc
 * (gồm _id/userId/timestamps/__v qua index signature của `UserProfileStats`); khi
 * chưa có, use-case áp fallback `{ xp:0, level:1, currentStreak:0, highestStreak:0 }`.
 */
export type ProfileStats = UserProfileStats;

export interface GetMyProfileInput {
  userId: string;
}

/** Mirror `{ user: sanitizeUser, stats }` — stats LUÔN non-null (đã áp fallback). */
export interface GetMyProfileResult {
  user: ProfileSafeUser;
  stats: ProfileStats;
}

export interface UpdateMyProfileInput {
  userId: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
}

/**
 * Legacy PATCH `data` = bản thân `sanitizeUser` (phẳng, KHÔNG bọc `{ user }`).
 * Vì vậy result = `ProfileSafeUser` để controller migrate giữ đúng shape phẳng.
 */
export type UpdateMyProfileResult = ProfileSafeUser;

export interface UploadAvatarInput {
  userId: string;
  /** File đã được presentation (FileInterceptor) parse — type thuần domain. */
  file?: AvatarUploadFile;
}

/** Legacy POST avatar `data` = `sanitizeUser` phẳng (giống PATCH). */
export type UploadAvatarResult = ProfileSafeUser;
