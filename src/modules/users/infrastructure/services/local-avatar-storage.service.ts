import { Injectable } from '@nestjs/common';
import { saveUploadedFile } from '../../../../configs/upload';
import {
  AvatarStorageResult,
  AvatarUploadFile,
  IAvatarStorage,
} from '../../domain/interfaces/avatar-storage.port';

/**
 * Adapter cho `IAvatarStorage` — wrap helper local-disk `saveUploadedFile` hiện tại
 * để giữ ĐÚNG behavior upload avatar (UC09). Đây là nơi DUY NHẤT (scope users) chạm
 * filesystem/storage; domain/application KHÔNG biết `Express.Multer.File` hay `/uploads`.
 *
 * Mirror legacy `saveUploadedFile(file, 'avatars')`:
 * - Ghi local disk vào `UPLOAD_DIR/avatars`, trả public URL `/uploads/avatars/<timestamp>-<name>`.
 * - Size limit do helper enforce (`MAX_FILE_SIZE_MB`, check SAU khi có buffer) →
 *   ném `BadRequestError` y như hiện tại (adapter chỉ propagate, KHÔNG nuốt lỗi).
 * - KHÔNG validate mime (legacy không validate). KHÔNG xoá avatar cũ. KHÔNG log buffer.
 *
 * Helper nhận `File | Express.Multer.File` và đi nhánh `'buffer' in file`. `AvatarUploadFile`
 * (buffer/originalname/size/mimetype) đủ tương thích nhánh đó; cast qua `Parameters<...>` để
 * KHÔNG phải nêu trực tiếp `Express.Multer.File` ở tầng này (giữ adapter gọn, decoupled).
 */
@Injectable()
export class LocalAvatarStorageService implements IAvatarStorage {
  async saveAvatar(file: AvatarUploadFile): Promise<AvatarStorageResult> {
    const url = await saveUploadedFile(
      file as unknown as Parameters<typeof saveUploadedFile>[0],
      'avatars',
    );
    // Chỉ trả URL public (thứ DUY NHẤT legacy dùng) — KHÔNG lộ absolute server path.
    // `filename` lấy từ đuôi URL = tên file thật đã lưu (KHÔNG phải originalname).
    return { url, filename: url.split('/').pop() };
  }
}
