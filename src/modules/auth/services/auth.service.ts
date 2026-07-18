import crypto from 'crypto';
import bcrypt from 'bcryptjs'; 
import jwt from 'jsonwebtoken';
import { PasswordResetToken } from '../models/password-reset-token.model';
import { User, IUser } from '../models/user.model';
import { RefreshToken } from '../models/refresh-token.model';
import { assertUserCanAuthenticate, sanitizeUser, SafeUser } from '../utils/user-sanitizer';
import { UserStats } from '../../gamification/models/user-stats.model';
import { env } from '../../../configs/env';
import { logger } from '../../../configs/logger';
import { BadRequestError, ForbiddenError, NotFoundError, UnauthorizedError } from '../../../common/custom-error';
import { EmailService } from './email.service';

const EMAIL_VERIFICATION_CODE_TTL_MS = 10 * 60 * 1000;
const PASSWORD_RESET_TOKEN_TTL_MS = 60 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes
const PASSWORD_RESET_URL = process.env.PASSWORD_RESET_URL || 'http://localhost:3001/reset-password';
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';

type GoogleTokenResponse = {
  access_token?: string;
};

type GoogleUserInfo = {
  sub?: string;
  email?: string;
  email_verified?: boolean;
  given_name?: string;
  family_name?: string;
  name?: string;
  picture?: string;
};

/**
 * @deprecated DEV1.5A — Auth request flow đã migrate hoàn toàn sang Clean Architecture
 * use-cases (`src/modules/auth/application/services/*`). `AuthController` KHÔNG còn gọi
 * service này; không module nào khác import nó (chỉ còn provider/export trong `AuthModule`).
 *
 * File được GIỮ TẠM cho rollback/compatibility tới final cleanup phase (DEV1.5B+).
 * KHÔNG thêm tính năng mới ở đây — mọi logic auth mới phải đi qua use-case + port.
 * Không đổi logic/signature/error message/SMTP/Google/refresh behavior ở phase này.
 */
export class AuthService {
  static generateTokens(payload: { id: string; email: string; role: string }) {
    const accessToken = jwt.sign(payload, env.JWT_ACCESS_SECRET, {
      expiresIn: env.JWT_ACCESS_EXPIRES_IN as any,
    });

    const refreshToken = jwt.sign(payload, env.JWT_REFRESH_SECRET, {
      expiresIn: env.JWT_REFRESH_EXPIRES_IN as any,
    });

    return { accessToken, refreshToken };
  }

  static async register(data: any) {
    const existing = await User.findOne({ email: data.email });
    if (existing) {
      throw new BadRequestError('Email address is already in use.');
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    const user = await User.create({
      email: data.email,
      passwordHash, 
      firstName: data.firstName,
      lastName: data.lastName,
      role: 'STUDENT',
      isVerified: false,
      isActive: true,
    });

    // Initialize user stats for gamification
    await UserStats.create({
      userId: user._id,
      xp: 0,
      level: 1,
    });

    await this.createAndSendVerificationToken(user);

    return {
      user: sanitizeUser(user),
      verificationRequired: true,
      message: 'Please verify your email before logging in.',
    };
  }

  static async login(data: any) {
    const user = await User.findOne({ email: data.email });
    if (!user || !user.passwordHash) {
      // Always run a dummy bcrypt comparison on missing-user path so the
      // response timing is comparable to the wrong-password path. Prevents
      // user enumeration via timing side-channel.
      await bcrypt.compare(data.password ?? '', '$2a$10$invalidsaltdummyHASHvaluetomatchTHEbcryptOPCOST');
      throw new BadRequestError('Invalid credentials.');
    }

    // SECURITY (P0): account lockout after consecutive failed attempts.
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      throw new ForbiddenError(
        `Account temporarily locked due to repeated failed login attempts. Try again in ${minutes} minute(s).`
      );
    }

    const matches = await bcrypt.compare(data.password, user.passwordHash);
    if (!matches) {
      const attempts = (user.failedLoginAttempts ?? 0) + 1;
      user.failedLoginAttempts = attempts;
      if (attempts >= MAX_LOGIN_ATTEMPTS) {
        user.lockedUntil = new Date(Date.now() + LOGIN_LOCKOUT_MS);
        user.failedLoginAttempts = 0;
        await user.save();
        logger.warn(`Account locked: ${user.email} (${attempts} failed attempts)`);
        throw new ForbiddenError(
          `Account locked for ${LOGIN_LOCKOUT_MS / 60000} minutes after too many failed attempts.`
        );
      }
      await user.save();
      throw new BadRequestError('Invalid credentials.');
    }

    assertUserCanAuthenticate(user);
    if (!user.isVerified) {
      throw new ForbiddenError('Please verify your email before logging in.');
    }

    // Successful login: reset counters.
    user.failedLoginAttempts = 0;
    user.lockedUntil = undefined;
    user.lastLoginAt = new Date();
    await user.save();

    const tokens = this.generateTokens({
      id: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await RefreshToken.create({
      token: tokens.refreshToken,
      userId: user._id,
      expiresAt,
    });

    return {
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      ...tokens,
    };
  }

  static getGoogleAuthorizationUrl() {
    this.assertGoogleOAuthConfigured();

    const callbackUrl = this.getGoogleCallbackUrl();
    const params = new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID as string,
      redirect_uri: callbackUrl,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'select_account',
    });

    return `${GOOGLE_AUTH_URL}?${params.toString()}`;
  }

  static async loginWithGoogleCode(code: string) {
    this.assertGoogleOAuthConfigured();

    const googleTokens = await this.exchangeGoogleCode(code);
    if (!googleTokens.access_token) {
      throw new UnauthorizedError('Google OAuth did not return an access token.');
    }

    const profile = await this.getGoogleUserInfo(googleTokens.access_token);
    if (!profile.email) {
      throw new BadRequestError('Google profile email is missing.');
    }

    if (!profile.sub) {
      throw new BadRequestError('Google profile subject is missing.');
    }

    if (profile.email_verified === false) {
      throw new BadRequestError('Google profile email is not verified.');
    }

    const verifiedAt = new Date();
    const email = profile.email.toLowerCase().trim();
    const existingUser = await User.findOne({ email });
    const user = existingUser || (await this.createGoogleUser({ ...profile, email }, verifiedAt));

    if (existingUser) {
      assertUserCanAuthenticate(existingUser);

      if (existingUser.googleId && existingUser.googleId !== profile.sub) {
        throw new BadRequestError('Email address is linked to a different Google account.');
      }

      if (!existingUser.googleId) {
        existingUser.googleId = profile.sub;
      }

      if (!existingUser.isVerified) {
        existingUser.isVerified = true;
      }

      if (!existingUser.emailVerifiedAt) {
        existingUser.emailVerifiedAt = verifiedAt;
      }

      if (!existingUser.avatarUrl && profile.picture) {
        existingUser.avatarUrl = profile.picture;
      }
    }

    user.lastLoginAt = verifiedAt;
    await user.save();

    return this.createAuthResponse(user);
  }

  static async refresh(token: string) {
    const storedToken = await RefreshToken.findOne({ token });

    // SECURITY (P0): refresh-token reuse detection. If the token cryptographically
    // verifies but is NOT in our store, assume it was rotated previously and the
    // bearer is replaying a stolen copy. Revoke all of that user's refresh
    // tokens to force re-login everywhere.
    if (!storedToken) {
      try {
        const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as { id: string };
        if (decoded?.id) {
          await RefreshToken.deleteMany({ userId: decoded.id });
          logger.warn(
            `Refresh-token reuse detected for user ${decoded.id}. All sessions revoked.`
          );
        }
      } catch {
        // Bad signature — nothing to revoke, just reject.
      }
      throw new UnauthorizedError('Refresh token is invalid or has expired.');
    }

    if (storedToken.expiresAt < new Date()) {
      await RefreshToken.deleteOne({ _id: storedToken._id });
      throw new UnauthorizedError('Refresh token is invalid or has expired.');
    }

    let decoded: { id: string; email: string; role: string };
    try {
      decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as {
        id: string;
        email: string;
        role: string;
      };
    } catch (err) {
      throw new UnauthorizedError('Refresh token verification failed.');
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      await RefreshToken.deleteOne({ _id: storedToken._id });
      throw new UnauthorizedError('Refresh token user no longer exists.');
    }

    assertUserCanAuthenticate(user);
    await RefreshToken.deleteOne({ _id: storedToken._id });

    const tokens = this.generateTokens({
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await RefreshToken.create({
      token: tokens.refreshToken,
      userId: decoded.id as any,
      expiresAt,
    });

    return tokens;
  }

  static async logout(token: string) {
    await RefreshToken.deleteOne({ token });
    return true;
  }

  static async verifyEmail(email: string, code: string) {
    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) {
      throw new BadRequestError('Verification code is invalid or expired.');
    }

    if (user.isVerified) {
      return {
        user: sanitizeUser(user),
      };
    }

    if (!user.emailVerificationCodeHash || !user.emailVerificationCodeExpiresAt) {
      throw new BadRequestError('Verification code is invalid or expired.');
    }

    if (user.emailVerificationCodeExpiresAt < new Date()) {
      throw new BadRequestError('Verification code is invalid or expired.');
    }

    if ((user.emailVerificationCodeAttempts ?? 0) >= 5) {
      throw new BadRequestError('Verification code is invalid or expired.');
    }

    if (this.hashVerificationCode(user._id.toString(), code) !== user.emailVerificationCodeHash) {
      user.emailVerificationCodeAttempts = (user.emailVerificationCodeAttempts ?? 0) + 1;
      await user.save();
      throw new BadRequestError('Verification code is invalid.');
    }

    const verifiedAt = new Date();
    user.isVerified = true;
    user.emailVerifiedAt = verifiedAt;
    user.emailVerificationCodeHash = undefined;
    user.emailVerificationCodeExpiresAt = undefined;
    user.emailVerificationCodeAttempts = undefined;
    user.emailVerificationLastSentAt = undefined;

    await user.save();

    return {
      user: sanitizeUser(user),
    };
  }

  static async resendVerification(email: string) {
    const user = await User.findOne({ email });
    if (!user) {
      throw new NotFoundError('User not found.');
    }

    if (user.isVerified) {
      throw new BadRequestError('Email address is already verified.');
    }

    await this.createAndSendVerificationToken(user);

    return true;
  }

  static async forgotPassword(email: string) {
    const user = await User.findOne({ email });
    if (!user || user.isActive === false) {
      return true;
    }

    await PasswordResetToken.updateMany(
      {
        userId: user._id,
        $or: [{ usedAt: { $exists: false } }, { usedAt: null }],
      },
      { usedAt: new Date() }
    );

    await this.createAndSendPasswordResetToken(user);

    return true;
  }

  static async resetPassword(token: string, newPassword: string) {
    const tokenHash = this.hashToken(token);
    const resetToken = await PasswordResetToken.findOne({ tokenHash });

    if (!resetToken) {
      throw new BadRequestError('Password reset token is invalid.');
    }

    if (resetToken.usedAt) {
      throw new BadRequestError('Password reset token has already been used.');
    }

    if (resetToken.expiresAt < new Date()) {
      throw new BadRequestError('Password reset token has expired.');
    }

    const user = await User.findById(resetToken.userId);
    if (!user) {
      throw new NotFoundError('User for password reset token was not found.');
    }

    const usedAt = new Date();
    user.passwordHash = await bcrypt.hash(newPassword, 10);
    resetToken.usedAt = usedAt;

    await Promise.all([
      user.save(),
      resetToken.save(),
      RefreshToken.deleteMany({ userId: user._id }),
    ]);

    return true;
  }

  static async getSessionUser(userId: string): Promise<SafeUser> {
    const user = await User.findById(userId);
    if (!user) {
      throw new UnauthorizedError('Authenticated user no longer exists.');
    }

    assertUserCanAuthenticate(user);

    return sanitizeUser(user);
  }

  private static async createAndSendVerificationToken(user: IUser) {
    const code = this.generateVerificationCode();
    user.emailVerificationCodeHash = this.hashVerificationCode(user._id.toString(), code);
    user.emailVerificationCodeExpiresAt = new Date(Date.now() + EMAIL_VERIFICATION_CODE_TTL_MS);
    user.emailVerificationCodeAttempts = 0;
    user.emailVerificationLastSentAt = new Date();
    await user.save();

    await EmailService.sendVerificationEmail({
      email: user.email,
      firstName: user.firstName,
      code,
    });
  }

  private static async createAndSendPasswordResetToken(user: IUser) {
    const rawToken = this.generateRawToken();
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS);

    await PasswordResetToken.create({
      userId: user._id,
      tokenHash,
      expiresAt,
    });

    const resetUrl = `${PASSWORD_RESET_URL}?token=${encodeURIComponent(rawToken)}`;
    await EmailService.sendPasswordResetEmail({
      email: user.email,
      firstName: user.firstName,
      resetUrl,
    });
  }

  private static generateRawToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  private static generateVerificationCode() {
    return crypto.randomInt(100000, 1000000).toString();
  }

  private static hashToken(token: string) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private static hashVerificationCode(userId: string, code: string) {
    return crypto.createHash('sha256').update(`${userId}:${code}`).digest('hex');
  }

  private static assertGoogleOAuthConfigured() {
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
      throw new BadRequestError('Google OAuth is not configured.');
    }
  }

  private static getGoogleCallbackUrl() {
    return env.GOOGLE_CALLBACK_URL || `http://localhost:${env.PORT}/api/v1/auth/google/callback`;
  }

  private static async exchangeGoogleCode(code: string): Promise<GoogleTokenResponse> {
    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: env.GOOGLE_CLIENT_ID as string,
        client_secret: env.GOOGLE_CLIENT_SECRET as string,
        redirect_uri: this.getGoogleCallbackUrl(),
        grant_type: 'authorization_code',
      }),
    });

    if (!response.ok) {
      throw new UnauthorizedError('Google OAuth token exchange failed.');
    }

    return response.json() as Promise<GoogleTokenResponse>;
  }

  private static async getGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
    const response = await fetch(GOOGLE_USERINFO_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new UnauthorizedError('Failed to retrieve Google profile.');
    }

    return response.json() as Promise<GoogleUserInfo>;
  }

  private static async createGoogleUser(profile: GoogleUserInfo, verifiedAt: Date) {
    const nameParts = (profile.name || '').trim().split(/\s+/).filter(Boolean);
    const firstName = profile.given_name || nameParts[0] || 'Google';
    const lastName = profile.family_name || nameParts.slice(1).join(' ') || 'User';

    const user = await User.create({
      email: profile.email,
      firstName,
      lastName,
      role: 'STUDENT',
      avatarUrl: profile.picture,
      googleId: profile.sub,
      isVerified: true,
      emailVerifiedAt: verifiedAt,
      isActive: true,
      lastLoginAt: verifiedAt,
    });

    await UserStats.create({
      userId: user._id,
      xp: 0,
      level: 1,
    });

    return user;
  }

  private static async createAuthResponse(user: IUser) {
    const tokens = this.generateTokens({
      id: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await RefreshToken.create({
      token: tokens.refreshToken,
      userId: user._id,
      expiresAt,
    });

    return {
      user: sanitizeUser(user),
      ...tokens,
    };
  }
}
export default AuthService;
