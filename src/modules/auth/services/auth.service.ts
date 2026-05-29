import crypto from 'crypto';
import bcrypt from 'bcryptjs'; 
import jwt from 'jsonwebtoken';
import { EmailVerificationToken } from '../models/email-verification-token.model';
import { User, IUser } from '../models/user.model';
import { RefreshToken } from '../models/refresh-token.model';
import { UserStats } from '../../gamification/models/user-stats.model';
import { env } from '../../../configs/env';
import { AuthenticatedUser } from '../../../common/api-handler';
import { BadRequestError, ForbiddenError, NotFoundError, UnauthorizedError } from '../../../common/custom-error';
import { EmailService } from './email.service';

const EMAIL_VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const EMAIL_VERIFICATION_URL =
  process.env.EMAIL_VERIFICATION_URL || 'http://localhost:3000/api/v1/auth/verify-email';

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
    const tokenHash = this.hashVerificationToken(token);
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
    const rawToken = this.generateRawVerificationToken();
    const tokenHash = this.hashVerificationToken(rawToken);
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

  private static generateRawVerificationToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  private static hashVerificationToken(token: string) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
export default AuthService;
