import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { IUser } from '../models/user.model';
import { IRefreshToken } from '../models/refresh-token.model';
import { BadRequestError, UnauthorizedError } from '../../../common/custom-error';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectModel('User')         private userModel:         Model<IUser>,
    @InjectModel('RefreshToken') private refreshTokenModel: Model<IRefreshToken>,
    @InjectModel('UserStats')    private userStatsModel:    Model<any>,
    private readonly jwtService:    JwtService,
    private readonly config:        ConfigService,
  ) {}

  // ── Token helpers ──────────────────────────────────────────────────────────

  private generateTokens(payload: { id: string; email: string; role: string }) {
    const accessSecret  = this.config.get<string>('jwt.accessSecret')!;
    const refreshSecret = this.config.get<string>('jwt.refreshSecret')!;
    const accessExp     = this.config.get<string>('jwt.accessExpiresIn')  ?? '15m';
    const refreshExp    = this.config.get<string>('jwt.refreshExpiresIn') ?? '7d';

    const accessToken  = jwt.sign(payload, accessSecret,  { expiresIn: accessExp  as any });
    const refreshToken = jwt.sign(payload, refreshSecret, { expiresIn: refreshExp as any });
    return { accessToken, refreshToken };
  }

  private async saveRefreshToken(userId: any, token: string) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await this.refreshTokenModel.create({ token, userId, expiresAt });
  }

  // ── Endpoints ─────────────────────────────────────────────────────────────

  async register(data: { email: string; password: string; firstName: string; lastName: string }) {
    const existing = await this.userModel.findOne({ email: data.email });
    if (existing) throw new BadRequestError('Email address is already in use.');

    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await this.userModel.create({
      email: data.email,
      passwordHash,
      firstName: data.firstName,
      lastName:  data.lastName,
      role:      'STUDENT',
    });

    await this.userStatsModel.create({ userId: user._id, xp: 0, level: 1 });

    const tokens = this.generateTokens({
      id:    user._id.toString(),
      email: user.email,
      role:  user.role,
    });
    await this.saveRefreshToken(user._id, tokens.refreshToken);

    return {
      user: {
        _id:       user._id,
        id:        user._id,
        email:     user.email,
        firstName: user.firstName,
        lastName:  user.lastName,
        name:      `${user.firstName} ${user.lastName}`.trim(),
        role:      user.role,
        avatarUrl: user.avatarUrl,
        isPremium: user.isPremium,
        planType:  user.isPremium ? 'PREMIUM' : 'FREE',
      },
      ...tokens,
    };
  }

  async login(data: { email: string; password: string }) {
    const user = await this.userModel.findOne({ email: data.email });
    if (!user || !user.passwordHash) {
      throw new BadRequestError('Invalid email or password credentials.');
    }

    const matches = await bcrypt.compare(data.password, user.passwordHash);
    if (!matches) throw new BadRequestError('Invalid email or password credentials.');

    const tokens = this.generateTokens({
      id:    user._id.toString(),
      email: user.email,
      role:  user.role,
    });
    await this.saveRefreshToken(user._id, tokens.refreshToken);

    return {
      user: {
        _id:       user._id,
        id:        user._id,
        email:     user.email,
        firstName: user.firstName,
        lastName:  user.lastName,
        name:      `${user.firstName} ${user.lastName}`.trim(),
        role:      user.role,
        avatarUrl: user.avatarUrl,
        isPremium: user.isPremium,
        planType:  user.isPremium ? 'PREMIUM' : 'FREE',
      },
      ...tokens,
    };
  }

  async refresh(token: string) {
    const stored = await this.refreshTokenModel.findOne({ token });
    if (!stored || stored.expiresAt < new Date()) {
      if (stored) await this.refreshTokenModel.deleteOne({ _id: stored._id });
      throw new UnauthorizedError('Refresh token is invalid or has expired.');
    }

    try {
      const refreshSecret = this.config.get<string>('jwt.refreshSecret')!;
      const decoded = jwt.verify(token, refreshSecret) as { id: string; email: string; role: string };
      await this.refreshTokenModel.deleteOne({ _id: stored._id });

      const tokens = this.generateTokens({ id: decoded.id, email: decoded.email, role: decoded.role });
      await this.saveRefreshToken(decoded.id, tokens.refreshToken);
      return tokens;
    } catch {
      throw new UnauthorizedError('Refresh token verification failed.');
    }
  }

  async logout(token?: string) {
    if (token) await this.refreshTokenModel.deleteOne({ token });
    return true;
  }

  /** Issue a single-use password-reset token. Email delivery is left to ops. */
  async forgotPassword(email: string) {
    const user = await this.userModel.findOne({ email });
    // Always return success to avoid leaking which emails are registered.
    if (!user) return { sent: true };

    const token = (await import('crypto')).randomBytes(32).toString('hex');
    user.resetPasswordToken     = token;
    user.resetPasswordExpiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 min
    await user.save();

    this.logger.log(`[forgotPassword] token for ${email}: ${token}`); // TODO: send via email
    return { sent: true };
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await this.userModel.findOne({
      resetPasswordToken:     token,
      resetPasswordExpiresAt: { $gt: new Date() },
    });
    if (!user) throw new BadRequestError('Reset token is invalid or has expired.');

    user.passwordHash           = await bcrypt.hash(newPassword, 10);
    user.resetPasswordToken     = undefined;
    user.resetPasswordExpiresAt = undefined;
    await user.save();

    // Invalidate all existing refresh tokens for this user
    await this.refreshTokenModel.deleteMany({ userId: user._id });
    return { reset: true };
  }
}
