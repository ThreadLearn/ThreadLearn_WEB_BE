/**
 * PORT: lưu trữ avatar (UC09 — upload avatar). Type thuần domain — KHÔNG import
 * NestJS/Express/Multer/Mongoose/infrastructure/src/utils. Adapter ở infrastructure
 * hiện thực (DEV1.6B: `LocalAvatarStorageService` wrap helper local-disk hiện tại).
 *
 * Hợp đồng giữ ĐÚNG behavior hiện tại:
 * - Ghi local disk vào subdir `avatars`, trả public URL dạng `/uploads/avatars/...`.
 * - Size limit do helper enforce (MAX_FILE_SIZE_MB, check sau buffer).
 * - KHÔNG validate mime ở port (mirror legacy không validate).
 * - KHÔNG xoá avatar cũ.
 */

/** File upload tối thiểu — KHÔNG phụ thuộc Express.Multer để giữ domain sạch. */
export interface AvatarUploadFile {
  originalname: string;
  buffer: Buffer;
  size: number;
  mimetype?: string;
}

/** Kết quả lưu avatar. `path` để optional và KHÔNG dùng để lộ absolute server path. */
export interface AvatarStorageResult {
  url: string;
  filename?: string;
  path?: string;
  size?: number;
}

export interface IAvatarStorage {
  /** Lưu file avatar và trả public URL (mirror `saveUploadedFile(file, 'avatars')`). */
  saveAvatar(file: AvatarUploadFile): Promise<AvatarStorageResult>;
}

/** DI token cho `IAvatarStorage`. */
export const AVATAR_STORAGE = Symbol('AVATAR_STORAGE');
