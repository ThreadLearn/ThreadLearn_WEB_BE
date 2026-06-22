import { Injectable } from '@nestjs/common';
import { IUserProfilePort, UserProfileDto } from '../../domain/interfaces/user-profile.port';
// CHÚ Ý: Đây là nơi DUY NHẤT trong module leaderboard được phép import User model
import { User } from '../../../auth/models/user.model';

@Injectable()
export class MongoUserProfileAdapter implements IUserProfilePort {
  async findByUserIds(userIds: string[]): Promise<UserProfileDto[]> {
    const users = await User.find({ _id: { $in: userIds } })
      .select('firstName lastName avatarUrl')
      .lean();

    return users.map((user) => {
      const name = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || 'Student';
      return {
        userId: (user._id as any).toString(),
        name,
        avatarUrl: (user as any).avatarUrl,
      };
    });
  }
}
