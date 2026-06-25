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
} from './domain/interfaces';

// --- Infrastructure: Mongo repository adapters ---
import {
  MongoUserRepository,
  MongoRefreshTokenRepository,
  MongoEmailVerificationTokenRepository,
  MongoPasswordResetTokenRepository,
} from './infrastructure/persistence';

// --- Infrastructure: service adapters (bcrypt / jwt / smtp / google) ---
import {
  BcryptPasswordHasherService,
  JwtTokenService,
  SmtpEmailSenderService,
  GoogleOAuthService,
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
} from './application/services';

/**
 * AuthModule.
 *
 * DEV1.4A — chỉ WIRE provider Clean Architecture mới để DI compile/khởi tạo được.
 * Runtime auth vẫn chạy qua legacy `AuthController` → `AuthService` (tĩnh) như cũ;
 * `AuthController` CHƯA inject use-case mới (controller migration là phase sau).
 *
 * Legacy providers `AuthService`/`EmailService` được GIỮ NGUYÊN (vẫn export) để
 * không đổi runtime/Google/SMTP behavior. `SmtpEmailSenderService` gọi `EmailService`
 * tĩnh nên không cần inject — `EmailService` vẫn là provider sẵn có.
 */
@Module({
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
  ],
  exports: [AuthService, EmailService],
})
export class AuthModule {}
