import { Inject, Injectable } from '@nestjs/common';
import { Subscription } from '../../domain/entities/subscription.entity';
import { ISubscriptionRepository, SUBSCRIPTION_REPOSITORY } from '../../domain/interfaces/subscription.repository';

@Injectable()
export class GetMySubscriptionService {
  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY)
    private readonly subscriptionRepository: ISubscriptionRepository,
  ) {}

  async execute(userId: string): Promise<Subscription | null> {
    return this.subscriptionRepository.findLatestByUserId(userId);
  }
}
