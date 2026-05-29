import { User } from '../../auth/models/user.model';
import { assertUserCanAuthenticate, sanitizeUser } from '../../auth/utils/user-sanitizer';
import { UserStats } from '../../gamification/models/user-stats.model';
import { NotFoundError } from '../../../common/custom-error';

type UpdateProfileData = {
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
};

export class UsersService {
  static async getProfile(userId: string) {
    const user = await User.findById(userId).select('-passwordHash');
    if (!user) {
      throw new NotFoundError('User profile not found.');
    }
    assertUserCanAuthenticate(user);

    const stats = await UserStats.findOne({ userId });

    return {
      user: sanitizeUser(user),
      stats: stats || { xp: 0, level: 1, currentStreak: 0, highestStreak: 0 },
    };
  }

  static async updateProfile(userId: string, data: UpdateProfileData) {
    const user = await User.findById(userId).select('-passwordHash');
    if (!user) {
      throw new NotFoundError('User not found.');
    }

    assertUserCanAuthenticate(user);

    if (data.firstName !== undefined) user.firstName = data.firstName;
    if (data.lastName !== undefined) user.lastName = data.lastName;
    if (data.avatarUrl !== undefined) user.avatarUrl = data.avatarUrl;

    await user.save();
    return sanitizeUser(user);
  }

  static async updateAvatar(userId: string, avatarUrl: string) {
    const user = await User.findById(userId).select('-passwordHash');
    if (!user) {
      throw new NotFoundError('User not found.');
    }

    assertUserCanAuthenticate(user);
    user.avatarUrl = avatarUrl;
    await user.save();

    return sanitizeUser(user);
  }
}
export default UsersService;
