import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { User, UserDocument } from '../schemas/user.schema';
import { RefreshToken, RefreshTokenDocument } from '../schemas/refresh-token.schema';
import { UserStats } from '../../gamification/models/user-stats.model';
import { env } from '../../../configs/env';
import { BadRequestError, UnauthorizedError } from '../../../common/custom-error';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(RefreshToken.name) private readonly refreshTokenModel: Model<RefreshTokenDocument>,
  ) {}

  private generateTokens(payload: { id: string; email: string; role: string }) {
    const accessToken = jwt.sign(payload, env.JWT_ACCESS_SECRET, {
      expiresIn: env.JWT_ACCESS_EXPIRES_IN as any,
    });
    const refreshToken = jwt.sign(payload, env.JWT_REFRESH_SECRET, {
      expiresIn: env.JWT_REFRESH_EXPIRES_IN as any,
    });
    return { accessToken, refreshToken };
  }

  private buildRefreshExpiry(): Date {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    return expiresAt;
  }

  async register(data: any) {
    const existing = await this.userModel.findOne({ email: data.email });
    if (existing) {
      throw new BadRequestError('Email address is already in use.');
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    const user = await this.userModel.create({
      email: data.email,
      passwordHash,
      firstName: data.firstName,
      lastName: data.lastName,
      role: 'STUDENT',
    });

    // Gamification (UserStats) vẫn là Mongoose thuần — migrate ở đợt sau.
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

    await this.refreshTokenModel.create({
      token: tokens.refreshToken,
      userId: user._id,
      expiresAt: this.buildRefreshExpiry(),
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

  async login(data: any) {
    const user = await this.userModel.findOne({ email: data.email });
    if (!user || !user.passwordHash) {
      throw new BadRequestError('Invalid email or password credentials.');
    }

    const matches = await bcrypt.compare(data.password, user.passwordHash);
    if (!matches) {
      throw new BadRequestError('Invalid email or password credentials.');
    }

    const tokens = this.generateTokens({
      id: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    await this.refreshTokenModel.create({
      token: tokens.refreshToken,
      userId: user._id,
      expiresAt: this.buildRefreshExpiry(),
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

  async refresh(token: string) {
    const storedToken = await this.refreshTokenModel.findOne({ token });
    if (!storedToken || storedToken.expiresAt < new Date()) {
      if (storedToken) {
        await this.refreshTokenModel.deleteOne({ _id: storedToken._id });
      }
      throw new UnauthorizedError('Refresh token is invalid or has expired.');
    }

    try {
      const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as {
        id: string;
        email: string;
        role: string;
      };

      await this.refreshTokenModel.deleteOne({ _id: storedToken._id });

      const tokens = this.generateTokens({
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
      });

      await this.refreshTokenModel.create({
        token: tokens.refreshToken,
        userId: new Types.ObjectId(decoded.id),
        expiresAt: this.buildRefreshExpiry(),
      });

      return tokens;
    } catch (err) {
      throw new UnauthorizedError('Refresh token verification failed.');
    }
  }

  async logout(token: string) {
    await this.refreshTokenModel.deleteOne({ token });
    return true;
  }
}
