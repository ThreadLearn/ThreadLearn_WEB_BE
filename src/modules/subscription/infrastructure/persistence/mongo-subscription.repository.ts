import { Injectable } from '@nestjs/common';
import { DomainError, ErrorCode } from '../../../../shared/errors/error-codes';
import { Subscription } from '../../domain/entities/subscription.entity';
import { ISubscriptionRepository } from '../../domain/interfaces/subscription.repository';
import { SubscriptionMapper } from '../mapper/subscription.mapper';
import { SubscriptionModel } from './schemas/subscription.schema';

@Injectable()
export class MongoSubscriptionRepository implements ISubscriptionRepository {
  async findActiveByUserId(userId: string, now: Date): Promise<Subscription | null> {
    const doc = await SubscriptionModel.findOne({
      userId,
      status: 'active',
      expiresAt: { $gt: now },
    }).sort({ expiresAt: -1 });
    return doc ? SubscriptionMapper.toEntity(doc) : null;
  }

  async findLatestByUserId(userId: string): Promise<Subscription | null> {
    const doc = await SubscriptionModel.findOne({ userId }).sort({ expiresAt: -1 });
    return doc ? SubscriptionMapper.toEntity(doc) : null;
  }

  async create(subscription: Subscription): Promise<Subscription> {
    const doc = await SubscriptionModel.create(SubscriptionMapper.toPersistence(subscription));
    return SubscriptionMapper.toEntity(doc);
  }

  async update(subscription: Subscription): Promise<Subscription> {
    const doc = await SubscriptionModel.findByIdAndUpdate(subscription.id, SubscriptionMapper.toPersistence(subscription), {
      new: true,
      runValidators: true,
    });
    if (!doc) {
      throw DomainError.notFound(ErrorCode.SUBSCRIPTION_PURCHASE_NOT_FOUND, 'Subscription not found.');
    }
    return SubscriptionMapper.toEntity(doc);
  }
}
