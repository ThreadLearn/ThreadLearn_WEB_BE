import { Injectable } from '@nestjs/common';
import { User } from '../../../auth/models/user.model';
import { IUserPlanAccessRepository } from '../../domain/interfaces/user-plan-access.repository';

@Injectable()
export class MongoUserPlanAccessRepository implements IUserPlanAccessRepository {
  async grantPremiumAccess(userId: string, expiresAt: Date): Promise<void> {
    await User.findByIdAndUpdate(userId, {
      $set: {
        planType: 'PREMIUM',
        subscriptionExpiresAt: expiresAt,
      },
    });
  }
}
