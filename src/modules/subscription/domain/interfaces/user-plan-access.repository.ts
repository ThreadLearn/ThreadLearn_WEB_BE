export interface IUserPlanAccessRepository {
  grantPremiumAccess(userId: string, expiresAt: Date): Promise<void>;
}

export const USER_PLAN_ACCESS_REPOSITORY = Symbol('USER_PLAN_ACCESS_REPOSITORY');
