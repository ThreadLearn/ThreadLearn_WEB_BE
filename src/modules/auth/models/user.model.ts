/* ─────────────────────────────────────────────────────────────────────────
 *  COMPAT-SHIM TẠM THỜI — KHÔNG ĐỊNH NGHĨA SCHEMA MỚI
 * ─────────────────────────────────────────────────────────────────────────
 *  Lý do tồn tại:
 *    Đợt 1 đã chuyển User sang @nestjs/mongoose (auth/schemas/user.schema.ts)
 *    và xoá file model thuần cũ. Nhưng 5 consumer chưa migrate vẫn import
 *    `{ User }` từ đường dẫn này và gọi static method:
 *      - src/modules/admin/controllers/admin.controller.ts
 *      - src/modules/admin/services/admin.service.ts
 *      - src/modules/ai/services/ai.service.ts
 *      - src/modules/analytics/services/analytics.service.ts
 *      - src/modules/users/services/users.service.ts
 *
 *  File shim này KHÔNG định nghĩa schema riêng — chỉ dựng lại Mongoose Model
 *  từ CHÍNH `UserSchema` của file schema NestJS. Nhờ guard
 *  `mongoose.models.User || mongoose.model(...)` mà:
 *    - Nếu NestJS forFeature đã đăng ký Model "User" → shim trả về Model đó.
 *    - Nếu shim load trước → shim tạo Model, NestJS sau đó retrieve lại.
 *  → Một schema duy nhất, không hai-định-nghĩa chỏi nhau.
 *
 *  PHẢI XOÁ KHI nào? — khi đợt 8 (theo bản đồ migration) chuyển
 *  users/admin/ai/analytics sang @InjectModel(User.name). Lúc đó 5 file
 *  consumer hết import từ đây → xoá thư mục auth/models luôn.
 * ───────────────────────────────────────────────────────────────────────── */

import mongoose from 'mongoose';
import {
  User as UserClass,
  UserSchema,
  UserDocument,
} from '../schemas/user.schema';

export const User =
  (mongoose.models[UserClass.name] as mongoose.Model<UserDocument>) ||
  mongoose.model<UserDocument>(UserClass.name, UserSchema as any);

// Re-export type alias để các consumer cũ (nếu lỡ import) không gãy.
export type { UserDocument };
