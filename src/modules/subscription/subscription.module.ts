import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CreatePlanService } from './application/services/create-plan.service';
import { DeletePlanService } from './application/services/delete-plan.service';
import { GetMySubscriptionService } from './application/services/get-my-subscription.service';
import { GetPlanService } from './application/services/get-plan.service';
import { ListPlansService } from './application/services/list-plans.service';
import { ProcessPaymentWebhookService } from './application/services/process-payment-webhook.service';
import { PurchasePlanService } from './application/services/purchase-plan.service';
import { UpdatePlanService } from './application/services/update-plan.service';
import { PaymentSucceededHandler } from './application/event-handlers/payment-succeeded.handler';
import { PAYMENT_GATEWAY } from './domain/interfaces/payment-gateway.port';
import { PLAN_REPOSITORY } from './domain/interfaces/plan.repository';
import { PURCHASE_REPOSITORY } from './domain/interfaces/purchase.repository';
import { SUBSCRIPTION_REPOSITORY } from './domain/interfaces/subscription.repository';
import { MockPaymentAdapter } from './infrastructure/payment/mock-payment.adapter';
import { PayOSAdapter } from './infrastructure/payment/payos.adapter';
import { VNPayAdapter } from './infrastructure/payment/vnpay.adapter';
import { MongoPlanRepository } from './infrastructure/persistence/mongo-plan.repository';
import { MongoPurchaseRepository } from './infrastructure/persistence/mongo-purchase.repository';
import { MongoSubscriptionRepository } from './infrastructure/persistence/mongo-subscription.repository';
import { PlanController } from './presentation/controller/plan.controller';
import { SubscriptionController } from './presentation/controller/subscription.controller';

@Module({
  controllers: [PlanController, SubscriptionController],
  providers: [
    MongoPlanRepository,
    MongoPurchaseRepository,
    MongoSubscriptionRepository,
    MockPaymentAdapter,
    PayOSAdapter,
    VNPayAdapter,
    { provide: PLAN_REPOSITORY, useExisting: MongoPlanRepository },
    { provide: PURCHASE_REPOSITORY, useExisting: MongoPurchaseRepository },
    { provide: SUBSCRIPTION_REPOSITORY, useExisting: MongoSubscriptionRepository },
    {
      provide: PAYMENT_GATEWAY,
      inject: [ConfigService, MockPaymentAdapter, VNPayAdapter, PayOSAdapter],
      useFactory: (
        config: ConfigService,
        mockPaymentAdapter: MockPaymentAdapter,
        vnpayAdapter: VNPayAdapter,
        payOSAdapter: PayOSAdapter,
      ) => {
        const mode = config.get<string>('PAYMENT_GATEWAY_MODE', 'mock').toLowerCase();
        if (mode === 'vnpay') return vnpayAdapter;
        if (mode === 'payos') return payOSAdapter;
        return mockPaymentAdapter;
      },
    },
    CreatePlanService,
    UpdatePlanService,
    DeletePlanService,
    GetPlanService,
    ListPlansService,
    PurchasePlanService,
    ProcessPaymentWebhookService,
    GetMySubscriptionService,
    PaymentSucceededHandler,
  ],
  exports: [PLAN_REPOSITORY, PURCHASE_REPOSITORY, SUBSCRIPTION_REPOSITORY, PAYMENT_GATEWAY],
})
export class SubscriptionModule {}
