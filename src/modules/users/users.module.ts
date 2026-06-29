import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UsersController } from './controllers/users.controller';
import { UsersService } from './services/users.service';

// --- Domain port tokens (users) ---
import { AVATAR_STORAGE } from './domain/interfaces/avatar-storage.port';
import { USER_STATS_READER } from './domain/interfaces/user-stats-reader.port';

// --- Infrastructure adapters (DEV1.6B) ---
import { LocalAvatarStorageService } from './infrastructure/services/local-avatar-storage.service';
import { MongoUserStatsReaderService } from './infrastructure/services/mongo-user-stats-reader.service';

// --- Application use-cases (DEV1.6C) ---
import {
  GetMyProfileService,
  UpdateMyProfileService,
  UploadAvatarService,
} from './application/services';

/**
 * UsersModule.
 *
 * DEV1.6C — đăng ký Clean Architecture use-cases (UC09) + adapter + token mapping,
 * và import `AuthModule` để dùng `USER_REPOSITORY` (User aggregate thuộc auth module).
 * AuthModule KHÔNG import UsersModule ⇒ KHÔNG circular dependency.
 *
 * GIỮ NGUYÊN runtime: `UsersController` vẫn dùng `UsersService` legacy (chưa migrate);
 * provider mới được đăng ký nhưng CHƯA inject vào controller (chuẩn bị cho DEV1.6D).
 */
@Module({
  imports: [AuthModule],
  controllers: [UsersController],
  providers: [
    // Legacy (đang chạy thật — KHÔNG đổi)
    UsersService,

    // Infrastructure concrete adapters (DEV1.6B)
    LocalAvatarStorageService,
    MongoUserStatsReaderService,

    // Domain port token → adapter (useExisting để tránh tạo instance trùng)
    { provide: AVATAR_STORAGE, useExisting: LocalAvatarStorageService },
    { provide: USER_STATS_READER, useExisting: MongoUserStatsReaderService },

    // Application use-cases (đăng ký provider; CHƯA inject vào controller)
    GetMyProfileService,
    UpdateMyProfileService,
    UploadAvatarService,
  ],
  exports: [UsersService],
})
export class UsersModule {}
