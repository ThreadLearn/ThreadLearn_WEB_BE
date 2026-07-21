import { SubscriptionFeatureKey } from '../../../../shared/domain/subscription-features';

export interface IUserPlanAccessRepository {
  grantPlanAccess(userId: string, expiresAt: Date, features: SubscriptionFeatureKey[]): Promise<void>;
}

export const USER_PLAN_ACCESS_REPOSITORY = Symbol('USER_PLAN_ACCESS_REPOSITORY');
