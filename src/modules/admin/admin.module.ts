import { Module } from '@nestjs/common';
import { CodeExecutionModule } from '../code-execution/code-execution.module';
import { LearningAccessModule } from '../../shared/application/learning-access/learning-access.module';
import { AdminController } from './controllers/admin.controller';
import { AdminService } from './services/admin.service';

// --- Domain port token (admin) ---
import { INVITATION_EMAIL } from './domain/interfaces';

// --- Infrastructure adapter (DEV1.7B) ---
import { StudentInvitationEmailService } from './infrastructure/services';

/**
 * AdminModule.
 *
 * DEV1.7B — đăng ký foundation Clean Architecture cho UC10–13: adapter invitation email
 * `StudentInvitationEmailService` (wrap `EmailService.sendStudentInvitationEmail`) + token
 * `INVITATION_EMAIL`. CHƯA có consumer (use-cases để DEV1.7C; controller chưa migrate) ⇒
 * KHÔNG đổi runtime: `AdminController`/`AdminService` legacy static giữ nguyên.
 */
@Module({
  imports: [LearningAccessModule, CodeExecutionModule],
  controllers: [AdminController],
  providers: [
    // Legacy (static — KHÔNG đổi)
    AdminService,

    // Infrastructure concrete adapter (DEV1.7B)
    StudentInvitationEmailService,

    // Domain port token → adapter (useExisting để tránh tạo instance trùng)
    { provide: INVITATION_EMAIL, useExisting: StudentInvitationEmailService },
  ],
  exports: [AdminService],
})
export class AdminModule {}
