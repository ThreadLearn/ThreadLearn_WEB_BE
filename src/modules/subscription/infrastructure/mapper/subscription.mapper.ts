import { Subscription } from '../../domain/entities/subscription.entity';

export class SubscriptionMapper {
  static toEntity(doc: any): Subscription {
    return Subscription.fromPersistence({
      id: String(doc._id),
      userId: String(doc.userId),
      planId: String(doc.planId),
      status: doc.status,
      startedAt: doc.startedAt,
      expiresAt: doc.expiresAt,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  }

  static toPersistence(subscription: Subscription): Record<string, any> {
    const p = subscription.toProps();
    return {
      userId: p.userId,
      planId: p.planId,
      status: p.status,
      startedAt: p.startedAt,
      expiresAt: p.expiresAt,
    };
  }
}
