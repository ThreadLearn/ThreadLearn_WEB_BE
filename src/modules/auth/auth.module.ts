import { Module } from '@nestjs/common';
import { AuthController } from './controllers/auth.controller';
import { AuthService } from './services/auth.service';
import { EmailService } from './services/email.service';

// --- Domain port tokens (Symbol) ---
import {
  USER_REPOSITORY,
  REFRESH_TOKEN_REPOSITORY,
  EMAIL_VERIFICATION_TOKEN_REPOSITORY,
  PASSWORD_RESET_TOKEN_REPOSITORY,
  PASSWORD_HASHER,
  TOKEN_SERVICE,
  EMAIL_SENDER,
  GOOGLE_OAUTH,
  USER_STATS_PROVISIONER,
} from './domain/interfaces';

// --- Infrastructure: Mongo repository adapters ---
import {
  MongoUserRepository,
  MongoRefreshTokenRepository,
  MongoEmailVerificationTokenRepository,
  MongoPasswordResetTokenRepository,
} from './infrastructure/persistence';

// --- Infrastructure: service adapters (bcrypt / jwt / smtp / google / user-stats) ---
import {
  BcryptPasswordHasherService,
  JwtTokenService,
  SmtpEmailSenderService,
  GoogleOAuthService,
  MongoUserStatsProvisionerService,
} from './infrastructure/services';

// --- Application: use-case services (DEV1.3A/B/C/D) ---
import {
  RegisterUserService,
  LoginUserService,
  VerifyEmailService,
  ResendVerificationEmailService,
  ForgotPasswordService,
  ResetPasswordService,
  RefreshTokenService,
  LogoutService,
  GetSessionService,
  GoogleLoginService,
  GetGoogleAuthUrlService,
  HandleGoogleCallbackService,
} from './application/services';

// --- Application: side-effect handler (DEV1.4B — UserStats parity) ---
import { UserRegisteredHandler } from './application/events';
import { NotificationsModule } from '../notifications/notifications.module';

/**
 * AuthModule.
 *
 * DEV1.4C — `AuthController` đã migrate TOÀN BỘ request flow sang Clean Architecture
 * use-cases (DEV1.4C-1…4). Controller KHÔNG còn gọi `AuthService` legacy.
 *
 * DEV1.5A — `AuthService` được đánh dấu `@deprecated` (không module nào khác import).
 * Tuy vậy provider/export `AuthService`/`EmailService` VẪN GIỮ NGUYÊN ở phase này:
 * - `EmailService` còn là implementation thật sau port `EMAIL_SENDER`
 *   (`SmtpEmailSenderService` wrap static) và còn được `AdminService` gọi trực tiếp.
 * - `AuthService` giữ tạm cho rollback/compatibility tới final cleanup (DEV1.5B+),
 *   sau khi smoke HTTP đầy đủ (hiện app chưa boot do nợ kernel `LEARNING_ACCESS_DATA`).
 */
@Module({
  imports: [NotificationsModule],
  controllers: [AuthController],
  providers: [
    // Legacy (đang chạy thật — KHÔNG đổi)
    AuthService,
    EmailService,

    // Infrastructure concrete adapters (repository)
    MongoUserRepository,
    MongoRefreshTokenRepository,
    MongoEmailVerificationTokenRepository,
    MongoPasswordResetTokenRepository,

    // Infrastructure concrete adapters (service)
    BcryptPasswordHasherService,
    JwtTokenService,
    SmtpEmailSenderService,
    GoogleOAuthService,
    MongoUserStatsProvisionerService,

    // Domain port token → adapter (useExisting để tránh tạo instance trùng)
    { provide: USER_REPOSITORY, useExisting: MongoUserRepository },
    { provide: REFRESH_TOKEN_REPOSITORY, useExisting: MongoRefreshTokenRepository },
    {
      provide: EMAIL_VERIFICATION_TOKEN_REPOSITORY,
      useExisting: MongoEmailVerificationTokenRepository,
    },
    { provide: PASSWORD_RESET_TOKEN_REPOSITORY, useExisting: MongoPasswordResetTokenRepository },
    { provide: PASSWORD_HASHER, useExisting: BcryptPasswordHasherService },
    { provide: TOKEN_SERVICE, useExisting: JwtTokenService },
    { provide: EMAIL_SENDER, useExisting: SmtpEmailSenderService },
    { provide: GOOGLE_OAUTH, useExisting: GoogleOAuthService },
    { provide: USER_STATS_PROVISIONER, useExisting: MongoUserStatsProvisionerService },

    // Application side-effect handler (UserStats parity cho user mới)
    UserRegisteredHandler,

    // Application use-cases (đăng ký provider; CHƯA inject vào controller)
    RegisterUserService,
    LoginUserService,
    VerifyEmailService,
    ResendVerificationEmailService,
    ForgotPasswordService,
    ResetPasswordService,
    RefreshTokenService,
    LogoutService,
    GetSessionService,
    GoogleLoginService,
    GetGoogleAuthUrlService,
    HandleGoogleCallbackService,
  ],
  // `USER_REPOSITORY` được export để UsersModule (UC09 use-cases DEV1.6C) tái sử dụng
  // cùng adapter `MongoUserRepository` — User aggregate hiện thuộc auth module.
  // DEV1.7B — export thêm `PASSWORD_HASHER` + `USER_STATS_PROVISIONER` để AdminModule
  // (UC10 Add Student use-case DEV1.7C) tái sử dụng (hash password + provision UserStats).
  // Chỉ thêm vào `exports` — KHÔNG đổi provider/behavior; AdminModule sẽ `imports:[AuthModule]` ở DEV1.7C.
  exports: [
    AuthService,
    EmailService,
    USER_REPOSITORY,
    PASSWORD_HASHER,
    USER_STATS_PROVISIONER,
  ],
})
export class AuthModule {}
