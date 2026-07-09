import { UserEntity } from '../../../auth/domain/entities/user.entity';
import { AdminSafeUser } from '../dto/student-management-use-case.dto';

export class AdminUserPresenter {
  static toSafeUser(user: UserEntity): AdminSafeUser {
    const p = user.toProps();
    return {
      id: p.id,
      email: p.email,
      firstName: p.firstName ?? '',
      lastName: p.lastName ?? '',
      avatarUrl: p.avatarUrl,
      role: p.role,
      isVerified: p.isVerified,
      isActive: p.isActive,
      lastLoginAt: p.lastLoginAt,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    };
  }
}
