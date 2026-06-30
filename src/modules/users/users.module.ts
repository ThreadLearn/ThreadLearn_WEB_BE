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
 * DEV1.6D — `UsersController` đã migrate 3 route UC09 sang use-cases; KHÔNG còn dùng
 * `UsersService` legacy trong request flow.
 * DEV1.6E — `UsersService` được đánh dấu `@deprecated` nhưng GIỮ provider/export tạm cho
 * rollback/compatibility (chưa boot smoke HTTP do nợ kernel `LEARNING_ACCESS_DATA`).
 * Deletion provider/export để phase cleanup cuối.
 */
@Module({
  imports: [AuthModule],
  controllers: [UsersController],
  providers: [
    // Legacy (@deprecated DEV1.6E — KHÔNG còn trong request flow; giữ tạm cho rollback)
    UsersService,

    // Infrastructure concrete adapters (DEV1.6B)
    LocalAvatarStorageService,
    MongoUserStatsReaderService,

    // Domain port token → adapter (useExisting để tránh tạo instance trùng)
    { provide: AVATAR_STORAGE, useExisting: LocalAvatarStorageService },
    { provide: USER_STATS_READER, useExisting: MongoUserStatsReaderService },

    // Application use-cases (đã inject vào UsersController từ DEV1.6D)
    GetMyProfileService,
    UpdateMyProfileService,
    UploadAvatarService,
  ],
  exports: [UsersService],
})
export class UsersModule {}
