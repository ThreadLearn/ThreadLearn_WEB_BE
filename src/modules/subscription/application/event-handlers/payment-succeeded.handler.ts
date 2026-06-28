import { Inject, Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PLAN_REPOSITORY, IPlanRepository } from '../../domain/interfaces/plan.repository';
import { ISubscriptionRepository, SUBSCRIPTION_REPOSITORY } from '../../domain/interfaces/subscription.repository';
import { Subscription } from '../../domain/entities/subscription.entity';

interface PaymentSucceededEvent {
  purchaseId: string;
  userId: string;
  planId: string;
}

@Injectable()
export class PaymentSucceededHandler {
  constructor(
    @Inject(PLAN_REPOSITORY) private readonly planRepository: IPlanRepository,
    @Inject(SUBSCRIPTION_REPOSITORY) private readonly subscriptionRepository: ISubscriptionRepository,
  ) {}

  @OnEvent('payment.succeeded')
  async handle(event: PaymentSucceededEvent): Promise<void> {
    const plan = await this.planRepository.findById(event.planId);
    if (!plan) return;

    const now = new Date();
    const existing = await this.subscriptionRepository.findActiveByUserId(event.userId, now);
    const planProps = plan.toProps();

    if (existing) {
      existing.extend(plan.id, planProps.durationDays, now);
      await this.subscriptionRepository.update(existing);
      return;
    }

    await this.subscriptionRepository.create(
      Subscription.createActive({
        userId: event.userId,
        planId: plan.id,
        durationDays: planProps.durationDays,
        now,
      }),
    );
  }
}
