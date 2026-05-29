import { User } from '../../auth/models/user.model';
import { UserStats } from '../../gamification/models/user-stats.model';
import { ForbiddenError, NotFoundError } from '../../../common/custom-error';

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

    const stats = await UserStats.findOne({ userId });

    return {
      user,
      stats: stats || { xp: 0, level: 1, currentStreak: 0, highestStreak: 0 },
    };
  }

  static async updateProfile(userId: string, data: UpdateProfileData) {
    const user = await User.findById(userId).select('-passwordHash');
    if (!user) {
      throw new NotFoundError('User not found.');
    }

    this.assertUserCanUpdateProfile(user);

    if (data.firstName !== undefined) user.firstName = data.firstName;
    if (data.lastName !== undefined) user.lastName = data.lastName;
    if (data.avatarUrl !== undefined) user.avatarUrl = data.avatarUrl;

    await user.save();
    return this.toSafeProfile(user);
  }

  static async updateAvatar(userId: string, avatarUrl: string) {
    const user = await User.findById(userId).select('-passwordHash');
    if (!user) {
      throw new NotFoundError('User not found.');
    }

    this.assertUserCanUpdateProfile(user);
    user.avatarUrl = avatarUrl;
    await user.save();

    return user;
  }

  private static assertUserCanUpdateProfile(user: { isActive?: boolean; lockedAt?: Date | null }) {
    if (user.isActive === false) {
      throw new ForbiddenError('User account is inactive.');
    }

    if (user.lockedAt) {
      throw new ForbiddenError('User account is locked.');
    }
  }

  private static toSafeProfile(user: any) {
    return {
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      avatarUrl: user.avatarUrl,
      isVerified: user.isVerified,
      emailVerifiedAt: user.emailVerifiedAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
export default UsersService;
