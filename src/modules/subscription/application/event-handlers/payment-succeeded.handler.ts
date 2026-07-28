import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import {
  EVENT_PUBLISHER,
  EventSubscriber,
} from '../../../../shared/application/events/event-publisher.port';
import { PLAN_REPOSITORY, IPlanRepository } from '../../domain/interfaces/plan.repository';
import { ISubscriptionRepository, SUBSCRIPTION_REPOSITORY } from '../../domain/interfaces/subscription.repository';
import {
  IUserPlanAccessRepository,
  USER_PLAN_ACCESS_REPOSITORY,
} from '../../domain/interfaces/user-plan-access.repository';
import { Subscription } from '../../domain/entities/subscription.entity';
import { NotificationsService } from '../../../notifications/services/notifications.service';

interface PaymentSucceededEvent {
  purchaseId: string;
  userId: string;
  planId: string;
}

@Injectable()
export class PaymentSucceededHandler implements OnModuleInit {
  constructor(
    @Inject(PLAN_REPOSITORY) private readonly planRepository: IPlanRepository,
    @Inject(SUBSCRIPTION_REPOSITORY) private readonly subscriptionRepository: ISubscriptionRepository,
    @Inject(USER_PLAN_ACCESS_REPOSITORY)
    private readonly userPlanAccessRepository: IUserPlanAccessRepository,
    @Inject(EVENT_PUBLISHER)
    private readonly eventBus: EventSubscriber,
    private readonly notificationsService?: NotificationsService,
  ) {}

  onModuleInit(): void {
    this.eventBus.subscribe<PaymentSucceededEvent>(
      'payment.succeeded',
      this.handle.bind(this),
    );
  }

  async handle(event: PaymentSucceededEvent): Promise<void> {
    const plan = await this.planRepository.findById(event.planId);
    if (!plan) return;

    const now = new Date();
    const existing = await this.subscriptionRepository.findActiveByUserId(event.userId, now);
    const planProps = plan.toProps();

    if (existing) {
      existing.extend(plan.id, planProps.durationDays, now);
      const subscription = await this.subscriptionRepository.update(existing);
      await this.userPlanAccessRepository.grantPlanAccess(
        event.userId,
        subscription.expiresAt,
        planProps.features,
      );
      await this.notificationsService?.notifyAdminPaymentSuccess(event);
      return;
    }

    const subscription = await this.subscriptionRepository.create(
      Subscription.createActive({
        userId: event.userId,
        planId: plan.id,
        durationDays: planProps.durationDays,
        now,
      }),
    );
    await this.userPlanAccessRepository.grantPlanAccess(
      event.userId,
      subscription.expiresAt,
      planProps.features,
    );
    await this.notificationsService?.notifyAdminPaymentSuccess(event);
  }
}
