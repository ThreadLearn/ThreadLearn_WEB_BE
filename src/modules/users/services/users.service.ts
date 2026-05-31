import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IUser } from '../../auth/models/user.model';
import { NotFoundError } from '../../../common/custom-error';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel('User')      private userModel:      Model<IUser>,
    @InjectModel('UserStats') private userStatsModel: Model<any>,
  ) {}

  async getProfile(userId: string) {
    const user = await this.userModel.findById(userId).select('-passwordHash');
    if (!user) throw new NotFoundError('User profile not found.');

    const stats = await this.userStatsModel.findOne({ userId });
    return {
      user,
      stats: stats || { xp: 0, level: 1, currentStreak: 0, highestStreak: 0 },
    };
  }

  async updateAvatar(userId: string, avatarUrl: string) {
    const user = await this.userModel
      .findByIdAndUpdate(userId, { avatarUrl }, { new: true })
      .select('-passwordHash');
    if (!user) throw new NotFoundError('User not found.');
    return user;
  }
}
