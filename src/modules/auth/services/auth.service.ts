import bcrypt from 'bcryptjs'; 
import jwt from 'jsonwebtoken';
import { User } from '../models/user.model';
import { RefreshToken } from '../models/refresh-token.model';
import { UserStats } from '../../gamification/models/user-stats.model';
import { env } from '../../../configs/env';
import { AuthenticatedUser } from '../../../common/api-handler';
import { BadRequestError, ForbiddenError, UnauthorizedError } from '../../../common/custom-error';

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
}
export default AuthService;
