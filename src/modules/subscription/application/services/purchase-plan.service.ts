import { Inject, Injectable } from '@nestjs/common';
import { DomainError, ErrorCode } from '../../../../shared/errors/error-codes';
import { PAYMENT_GATEWAY, IPaymentGateway } from '../../domain/interfaces/payment-gateway.port';
import { PLAN_REPOSITORY, IPlanRepository } from '../../domain/interfaces/plan.repository';
import { IPurchaseRepository, PURCHASE_REPOSITORY } from '../../domain/interfaces/purchase.repository';
import { Purchase } from '../../domain/entities/purchase.entity';

@Injectable()
export class PurchasePlanService {
  constructor(
    @Inject(PLAN_REPOSITORY) private readonly planRepository: IPlanRepository,
    @Inject(PURCHASE_REPOSITORY) private readonly purchaseRepository: IPurchaseRepository,
    @Inject(PAYMENT_GATEWAY) private readonly paymentGateway: IPaymentGateway,
  ) {}

  async execute(userId: string, planId: string): Promise<Purchase> {
    const plan = await this.planRepository.findById(planId);
    if (!plan || !plan.isActive) {
      throw DomainError.notFound(ErrorCode.SUBSCRIPTION_PLAN_NOT_FOUND, 'Subscription plan not found.');
    }

    const planProps = plan.toProps();
    if (planProps.features.length === 0) {
      throw DomainError.badRequest(
        ErrorCode.SUBSCRIPTION_PLAN_INVALID_INPUT,
        'This legacy plan has no enforceable features and cannot be purchased.',
      );
    }
    let purchase = await this.purchaseRepository.create(
      Purchase.createNew({
        userId,
        planId: plan.id,
        amount: planProps.price,
        currency: planProps.currency,
      }),
    );

    const payment = await this.paymentGateway.createPayment({
      purchaseId: purchase.id,
      userId,
      amount: planProps.price,
      currency: planProps.currency,
      description: `Purchase subscription plan: ${planProps.name}`,
    });

    purchase.attachPayment(payment);
    purchase = await this.purchaseRepository.update(purchase);
    return purchase;
  }
}
