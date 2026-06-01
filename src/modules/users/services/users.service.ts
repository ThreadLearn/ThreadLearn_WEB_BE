import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import mongoose from 'mongoose';
import { IUser } from '../../auth/models/user.model';
import { BadRequestError, NotFoundError } from '../../../common/custom-error';

interface UpdateProfileDto {
  name?:      string;
  firstName?: string;
  lastName?:  string;
  avatarUrl?: string;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectModel('User')      private userModel:      Model<IUser>,
    @InjectModel('UserStats') private userStatsModel: Model<any>,
  ) {}

  async getProfile(userId: string) {
    const user = await this.userModel.findById(userId).select('-passwordHash -resetPasswordToken');
    if (!user) throw new NotFoundError('User profile not found.');

    const stats = await this.userStatsModel.findOne({ userId });
    return {
      user,
      stats: stats || { xp: 0, level: 1, currentStreak: 0, highestStreak: 0 },
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const patch: Record<string, unknown> = {};
    if (dto.name) {
      const parts = dto.name.trim().split(/\s+/);
      patch.firstName = parts.slice(0, -1).join(' ') || parts[0];
      patch.lastName  = parts.slice(-1)[0] !== parts[0] ? parts.slice(-1)[0] : '';
    }
    if (dto.firstName !== undefined) patch.firstName = dto.firstName;
    if (dto.lastName  !== undefined) patch.lastName  = dto.lastName;
    if (dto.avatarUrl !== undefined) patch.avatarUrl = dto.avatarUrl;

    const user = await this.userModel
      .findByIdAndUpdate(userId, patch, { new: true })
      .select('-passwordHash -resetPasswordToken');
    if (!user) throw new NotFoundError('User not found.');
    return user;
  }

  async updateAvatar(userId: string, avatarUrl: string) {
    return this.updateProfile(userId, { avatarUrl });
  }

  // ─── Admin (UC10-13) ──────────────────────────────────────────────────────

  async listUsers(page = 1, limit = 20, search = '') {
    const skip = (page - 1) * limit;
    const query: any = {};
    if (search.trim()) {
      const rx = new RegExp(search.trim(), 'i');
      query.$or = [
        { email:     rx },
        { firstName: rx },
        { lastName:  rx },
      ];
    }
    const [items, total] = await Promise.all([
      this.userModel.find(query)
        .select('-passwordHash -resetPasswordToken')
        .sort({ createdAt: -1 })
        .skip(skip).limit(limit).lean(),
      this.userModel.countDocuments(query),
    ]);
    return {
      data: items,
      page, limit, total,
      totalPages: Math.ceil(total / limit),
    };
  }

  async createStudent(payload: { name: string; email: string; password: string }) {
    const bcrypt = await import('bcryptjs');
    const exists = await this.userModel.exists({ email: payload.email });
    if (exists) throw new BadRequestError('Email already exists.');
    const parts = payload.name.trim().split(/\s+/);
    return this.userModel.create({
      email:        payload.email,
      passwordHash: await bcrypt.hash(payload.password, 10),
      firstName:    parts.slice(0, -1).join(' ') || parts[0],
      lastName:     parts.slice(-1)[0] !== parts[0] ? parts.slice(-1)[0] : '',
      role:         'STUDENT',
    });
  }

  async adminUpdateUser(userId: string, payload: any) {
    if (!mongoose.isValidObjectId(userId)) throw new NotFoundError('User not found.');
    const user = await this.userModel
      .findByIdAndUpdate(userId, payload, { new: true })
      .select('-passwordHash -resetPasswordToken');
    if (!user) throw new NotFoundError('User not found.');
    return user;
  }

  async toggleLock(userId: string) {
    if (!mongoose.isValidObjectId(userId)) throw new NotFoundError('User not found.');
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundError('User not found.');
    (user as any).isLocked = !(user as any).isLocked;
    await user.save();
    return user;
  }
}
