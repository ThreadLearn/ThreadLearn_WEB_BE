import { Subscription } from '../../domain/entities/subscription.entity';

export class SubscriptionPresenter {
  static toResponse(subscription: Subscription | null) {
    if (!subscription) return null;
    const p = subscription.toProps();
    return {
      _id: p.id,
      id: p.id,
      userId: p.userId,
      planId: p.planId,
      status: p.status,
      startedAt: p.startedAt,
      expiresAt: p.expiresAt,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    };
  }
}
