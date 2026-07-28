import { Injectable } from '@nestjs/common';
import { User } from '../../../auth/models/user.model';
import { IUserPlanAccessRepository } from '../../domain/interfaces/user-plan-access.repository';
import { SubscriptionFeatureKey } from '../../../../shared/domain/subscription-features';

@Injectable()
export class MongoUserPlanAccessRepository implements IUserPlanAccessRepository {
  async grantPlanAccess(
    userId: string,
    expiresAt: Date,
    features: SubscriptionFeatureKey[],
  ): Promise<void> {
    await User.findByIdAndUpdate(userId, {
      $set: {
        planType: 'PREMIUM',
        subscriptionExpiresAt: expiresAt,
        subscriptionFeatures: features,
      },
    });
  }
}
