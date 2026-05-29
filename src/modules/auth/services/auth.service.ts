import crypto from 'crypto';
import bcrypt from 'bcryptjs'; 
import jwt from 'jsonwebtoken';
import { EmailVerificationToken } from '../models/email-verification-token.model';
import { PasswordResetToken } from '../models/password-reset-token.model';
import { User, IUser } from '../models/user.model';
import { RefreshToken } from '../models/refresh-token.model';
import { UserStats } from '../../gamification/models/user-stats.model';
import { env } from '../../../configs/env';
import { AuthenticatedUser } from '../../../common/api-handler';
import { BadRequestError, ForbiddenError, NotFoundError, UnauthorizedError } from '../../../common/custom-error';
import { EmailService } from './email.service';

const EMAIL_VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const PASSWORD_RESET_TOKEN_TTL_MS = 60 * 60 * 1000;
const EMAIL_VERIFICATION_URL =
  process.env.EMAIL_VERIFICATION_URL || 'http://localhost:3000/api/v1/auth/verify-email';
const PASSWORD_RESET_URL = process.env.PASSWORD_RESET_URL || 'http://localhost:3000/reset-password';
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

    await this.createAndSendVerificationToken(user);

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

  static async login(data: any) {
    const user = await User.findOne({ email: data.email });
    if (!user || !user.passwordHash) {
      throw new BadRequestError('Invalid email or password credentials.');
    }

    const matches = await bcrypt.compare(data.password, user.passwordHash);
    if (!matches) {
      throw new BadRequestError('Invalid email or password credentials.');
    }

    this.assertUserCanAuthenticate(user);
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
      this.assertUserCanAuthenticate(existingUser);

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
    if (!storedToken || storedToken.expiresAt < new Date()) {
      if (storedToken) await RefreshToken.deleteOne({ _id: storedToken._id });
      throw new UnauthorizedError('Refresh token is invalid or has expired.');
    }

    try {
      const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as {
        id: string;
        email: string;
        role: string;
      };

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
    } catch (err) {
      throw new UnauthorizedError('Refresh token verification failed.');
    }
  }

  static async logout(token: string) {
    await RefreshToken.deleteOne({ token });
    return true;
  }

  static async verifyEmail(token: string) {
    const tokenHash = this.hashToken(token);
    const verificationToken = await EmailVerificationToken.findOne({ tokenHash });

    if (!verificationToken) {
      throw new BadRequestError('Verification token is invalid.');
    }

    if (verificationToken.usedAt) {
      throw new BadRequestError('Verification token has already been used.');
    }

    if (verificationToken.expiresAt < new Date()) {
      throw new BadRequestError('Verification token has expired.');
    }

    const user = await User.findById(verificationToken.userId);
    if (!user) {
      throw new NotFoundError('User for verification token was not found.');
    }

    if (user.isVerified) {
      verificationToken.usedAt = new Date();
      await verificationToken.save();
      throw new BadRequestError('Email address is already verified.');
    }

    const verifiedAt = new Date();
    verificationToken.usedAt = verifiedAt;
    user.isVerified = true;
    user.emailVerifiedAt = verifiedAt;

    await Promise.all([verificationToken.save(), user.save()]);

    return {
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isVerified: user.isVerified,
        emailVerifiedAt: user.emailVerifiedAt,
      },
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

    await EmailVerificationToken.updateMany(
      {
        userId: user._id,
        $or: [{ usedAt: { $exists: false } }, { usedAt: null }],
      },
      { usedAt: new Date() }
    );

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

  static async getSessionUser(userId: string): Promise<AuthenticatedUser> {
    const user = await User.findById(userId);
    if (!user) {
      throw new UnauthorizedError('Authenticated user no longer exists.');
    }

    this.assertUserCanAuthenticate(user);

    return {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
    };
  }

  private static assertUserCanAuthenticate(user: { isActive?: boolean; lockedAt?: Date | null }) {
    if (user.isActive === false) {
      throw new ForbiddenError('User account is inactive.');
    }

    if (user.lockedAt) {
      throw new ForbiddenError('User account is locked.');
    }
  }

  private static async createAndSendVerificationToken(user: IUser) {
    const rawToken = this.generateRawToken();
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_TOKEN_TTL_MS);

    await EmailVerificationToken.create({
      userId: user._id,
      tokenHash,
      expiresAt,
    });

    const verificationUrl = `${EMAIL_VERIFICATION_URL}?token=${encodeURIComponent(rawToken)}`;
    await EmailService.sendVerificationEmail({
      email: user.email,
      firstName: user.firstName,
      verificationUrl,
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

  private static hashToken(token: string) {
    return crypto.createHash('sha256').update(token).digest('hex');
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
}
export default AuthService;
