import { User } from '../../auth/models/user.model';
import { UserStats } from '../../gamification/models/user-stats.model';
import { NotFoundError } from '../../../common/custom-error';

export class UsersService {
  static async getProfile(userId: string) {
    const user = await User.findById(userId).select('-passwordHash');
    if (!user) {
      throw new NotFoundError('User profile not found.');
    }

    const stats = await UserStats.findOne({ userId });

    return {
      user,
      stats: stats || { xp: 0, level: 1, currentStreak: 0, highestStreak: 0 },
    };
  }

  static async updateAvatar(userId: string, avatarUrl: string) {
    const user = await User.findByIdAndUpdate(userId, { avatarUrl }, { new: true }).select('-passwordHash');
    if (!user) {
      throw new NotFoundError('User not found.');
    }
    return user;
  }
}
export default UsersService;
