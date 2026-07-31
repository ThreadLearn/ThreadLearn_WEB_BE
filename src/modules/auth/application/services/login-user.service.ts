import { Inject, Injectable } from '@nestjs/common';
import { BadRequestError, ForbiddenError } from '../../../../common/custom-error';
import { UserEntity } from '../../domain/entities/user.entity';
import { RefreshTokenEntity } from '../../domain/entities/refresh-token.entity';
import { IUserRepository, USER_REPOSITORY } from '../../domain/interfaces/user.repository';
import { IPasswordHasher, PASSWORD_HASHER } from '../../domain/interfaces/password-hasher.port';
import { ITokenService, TOKEN_SERVICE } from '../../domain/interfaces/token-service.port';
import {
  IRefreshTokenRepository,
  REFRESH_TOKEN_REPOSITORY,
} from '../../domain/interfaces/refresh-token.repository';
import { LoginUserInput, LoginUserResult } from '../dto/auth-use-case.dto';
import { ACCOUNT_LOCKED_MESSAGE } from '../../auth-error-messages';

/** Refresh token sống 7 ngày — giữ đúng TTL của luồng đăng nhập hiện tại. */
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Lockout parity — mirror hằng số legacy `AuthService`:
 * `MAX_LOGIN_ATTEMPTS = 5`, `LOGIN_LOCKOUT_MS = 15 phút`. Use-case truyền 2 hằng
 * này xuống domain (`recordFailedLogin`) thay vì để domain hardcode.
 */
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_LOCKOUT_MS = 15 * 60 * 1000;

/**
 * Hash bcrypt cố ý KHÔNG hợp lệ — chạy compare giả trên nhánh user-không-tồn-tại
 * để cân bằng thời gian phản hồi (chống user enumeration qua timing). Đây KHÔNG
 * phải secret; chỉ là hằng số để bcrypt.compare tốn cùng op-cost.
 */
const DUMMY_PASSWORD_HASH = '$2a$10$invalidsaltdummyHASHvaluetomatchTHEbcryptOPCOST';

/**
 * UC04 — Login với email/password. Mirror luồng đăng nhập hiện tại:
 * tìm user → so khớp password (có dummy-compare chống enumeration) → chặn
 * inactive/locked → chặn chưa verify → ký access/refresh token → lưu refresh
 * token **raw** → cập nhật lastLogin → trả response thủ công hiện tại.
 *
 * Use-case CHỈ điều phối qua port. KHÔNG log password/token. KHÔNG đổi shape
 * response thủ công (KHÔNG thêm avatarUrl/isVerified).
 *
 * Phase DEV1.3A: chỉ tạo use-case, CHƯA wire vào AuthModule/runtime.
 */
@Injectable()
export class LoginUserService {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: IPasswordHasher,
    @Inject(TOKEN_SERVICE) private readonly tokenService: ITokenService,
    @Inject(REFRESH_TOKEN_REPOSITORY) private readonly refreshTokenRepo: IRefreshTokenRepository,
  ) {}

  async execute(input: LoginUserInput): Promise<LoginUserResult> {
    const now = new Date();
    const user = await this.userRepo.findByEmail(input.email);
    const passwordHash = user?.toProps().passwordHash;

    if (!user || !passwordHash) {
      // Cân bằng timing với nhánh sai-mật-khẩu để không lộ user có tồn tại hay không.
      await this.passwordHasher.compare(input.password ?? '', DUMMY_PASSWORD_HASH);
      throw new BadRequestError('Invalid credentials.');
    }

    // Lockout parity (legacy): chặn khi đang khoá tạm thời — TRƯỚC khi so khớp
    // password (đúng thứ tự legacy). Message + cách tính phút giữ y nguyên.
    if (user.isTemporarilyLocked(now)) {
      const minutes = Math.ceil((user.lockedUntil!.getTime() - now.getTime()) / 60000);
      throw new ForbiddenError(
        `Account temporarily locked due to repeated failed login attempts. Try again in ${minutes} minute(s).`,
      );
    }

    const matches = await this.passwordHasher.compare(input.password, passwordHash);
    if (!matches) {
      // Tăng counter; nếu chạm ngưỡng thì domain set lockedUntil + reset counter.
      const justLocked = user.recordFailedLogin({
        maxAttempts: MAX_LOGIN_ATTEMPTS,
        lockDurationMs: LOGIN_LOCKOUT_MS,
        now,
      });
      await this.userRepo.updateLoginSecurityState(user);
      if (justLocked) {
        throw new ForbiddenError(
          `Account locked for ${LOGIN_LOCKOUT_MS / 60000} minutes after too many failed attempts.`,
        );
      }
      throw new BadRequestError('Invalid credentials.');
    }

    this.assertCanAuthenticate(user);

    if (!user.isVerified) {
      throw new ForbiddenError('Please verify your email before logging in.');
    }

    // Login thành công: reset failedLoginAttempts, clear lockedUntil, set lastLoginAt.
    user.recordSuccessfulLogin(now);
    await this.userRepo.updateLoginSecurityState(user);

    const props = user.toProps();
    const payload = { id: props.id, email: props.email, role: props.role, tokenVersion: props.tokenVersion ?? 0 };
    const accessToken = this.tokenService.signAccessToken(payload);
    const refreshToken = this.tokenService.signRefreshToken(payload);

    await this.refreshTokenRepo.create(
      RefreshTokenEntity.createNew({
        userId: props.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      }),
    );

    return {
      user: {
        id: props.id,
        email: props.email,
        firstName: props.firstName ?? '',
        lastName: props.lastName ?? '',
        role: props.role,
      },
      accessToken,
      refreshToken,
    };
  }

  /** Mirror `assertUserCanAuthenticate`: chặn inactive hoặc locked. */
  private assertCanAuthenticate(user: UserEntity): void {
    const p = user.toProps();
    if (p.isActive === false) {
      throw new ForbiddenError(ACCOUNT_LOCKED_MESSAGE);
    }
    if (p.lockedAt) {
      throw new ForbiddenError(ACCOUNT_LOCKED_MESSAGE);
    }
  }
}
