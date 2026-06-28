import { Subscription } from '../entities/subscription.entity';

export interface ISubscriptionRepository {
  findActiveByUserId(userId: string, now: Date): Promise<Subscription | null>;
  findLatestByUserId(userId: string): Promise<Subscription | null>;
  create(subscription: Subscription): Promise<Subscription>;
  update(subscription: Subscription): Promise<Subscription>;
}

export const SUBSCRIPTION_REPOSITORY = Symbol('SUBSCRIPTION_REPOSITORY');
