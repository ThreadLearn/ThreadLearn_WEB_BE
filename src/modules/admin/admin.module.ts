import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CodeExecutionModule } from '../code-execution/code-execution.module';
import { LearningAccessModule } from '../../shared/application/learning-access/learning-access.module';
import { AdminController } from './controllers/admin.controller';
import { AdminService } from './services/admin.service';

// --- Domain port token (admin) ---
import { ADMIN_DASHBOARD_STATS_READER, INVITATION_EMAIL } from './domain/interfaces';

// --- Infrastructure adapter (DEV1.7B) ---
import {
  MongoAdminDashboardStatsReaderService,
  StudentInvitationEmailService,
} from './infrastructure/services';
import {
  AddStudentService,
  GetAdminBasicStatsService,
  GetAdminDashboardStatisticsService,
  GetStudentListService,
  LockStudentService,
  UnlockStudentService,
  UpdateStudentInfoService,
} from './application/services';

/**
 * AdminModule.
 *
 * DEV1.7B — đăng ký foundation Clean Architecture cho UC10–13: adapter invitation email
 * `StudentInvitationEmailService` (wrap `EmailService.sendStudentInvitationEmail`) + token
 * `INVITATION_EMAIL`. CHƯA có consumer (use-cases để DEV1.7C; controller chưa migrate) ⇒
 * KHÔNG đổi runtime: `AdminController`/`AdminService` legacy static giữ nguyên.
 * DEV1.7C update: application use-case providers are now registered below; controller migration
 * is intentionally left for the next phase.
 * DEV1.7E update: student routes are migrated; provider/export stays for non-migrated admin
 * routes and rollback compatibility.
 */
@Module({
  imports: [AuthModule, LearningAccessModule, CodeExecutionModule],
  controllers: [AdminController],
  providers: [
    // Legacy (static — KHÔNG đổi)
    AdminService,

    // Infrastructure concrete adapter (DEV1.7B)
    StudentInvitationEmailService,
    MongoAdminDashboardStatsReaderService,

    // Domain port token → adapter (useExisting để tránh tạo instance trùng)
    { provide: INVITATION_EMAIL, useExisting: StudentInvitationEmailService },
    { provide: ADMIN_DASHBOARD_STATS_READER, useExisting: MongoAdminDashboardStatsReaderService },
    AddStudentService,
    LockStudentService,
    UnlockStudentService,
    GetStudentListService,
    UpdateStudentInfoService,
    GetAdminBasicStatsService,
    GetAdminDashboardStatisticsService,
  ],
  exports: [AdminService],
})
export class AdminModule {}
