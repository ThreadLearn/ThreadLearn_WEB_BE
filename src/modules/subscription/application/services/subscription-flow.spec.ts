import { EventEmitter2 } from '@nestjs/event-emitter';
import { ErrorCode } from '../../../../shared/errors/error-codes';
import { Plan, PlanProps } from '../../domain/entities/plan.entity';
import { Purchase, PurchaseProps } from '../../domain/entities/purchase.entity';
import { Subscription, SubscriptionProps } from '../../domain/entities/subscription.entity';
import {
  IPaymentGateway,
  PaymentRequestInput,
  PaymentRequestResult,
  PaymentReconciliationResult,
  PaymentWebhookResult,
} from '../../domain/interfaces/payment-gateway.port';
import { IPlanRepository } from '../../domain/interfaces/plan.repository';
import { IPurchaseRepository } from '../../domain/interfaces/purchase.repository';
import { ISubscriptionRepository } from '../../domain/interfaces/subscription.repository';
import { IUserPlanAccessRepository } from '../../domain/interfaces/user-plan-access.repository';
import { PaymentSucceededHandler } from '../event-handlers/payment-succeeded.handler';
import { CreatePlanService } from './create-plan.service';
import { DeletePlanService } from './delete-plan.service';
import { GetMySubscriptionService } from './get-my-subscription.service';
import { GetMyPurchaseService } from './get-my-purchase.service';
import { ListPlansService } from './list-plans.service';
import { ProcessPaymentWebhookService } from './process-payment-webhook.service';
import { PurchasePlanService } from './purchase-plan.service';
import { ReconcilePaymentService } from './reconcile-payment.service';
import { UpdatePlanService } from './update-plan.service';

describe('Subscription UC51-52 service flow', () => {
  let planRepository: InMemoryPlanRepository;
  let purchaseRepository: InMemoryPurchaseRepository;
  let subscriptionRepository: InMemorySubscriptionRepository;
  let userPlanAccessRepository: InMemoryUserPlanAccessRepository;
  let paymentGateway: FakePaymentGateway;
  let eventEmitter: CapturingEventEmitter;
  let createPlan: CreatePlanService;
  let listPlans: ListPlansService;
  let updatePlan: UpdatePlanService;
  let deletePlan: DeletePlanService;
  let purchasePlan: PurchasePlanService;
  let processWebhook: ProcessPaymentWebhookService;
  let reconcilePayment: ReconcilePaymentService;
  let getMySubscription: GetMySubscriptionService;
  let getMyPurchase: GetMyPurchaseService;

  beforeEach(() => {
    planRepository = new InMemoryPlanRepository();
    purchaseRepository = new InMemoryPurchaseRepository();
    subscriptionRepository = new InMemorySubscriptionRepository();
    userPlanAccessRepository = new InMemoryUserPlanAccessRepository();
    paymentGateway = new FakePaymentGateway();
    eventEmitter = new CapturingEventEmitter();

    const paymentSucceededHandler = new PaymentSucceededHandler(
      planRepository,
      subscriptionRepository,
      userPlanAccessRepository,
      { subscribe: jest.fn() },
    );
    eventEmitter.handlePaymentSucceeded = (payload) => paymentSucceededHandler.handle(payload);

    createPlan = new CreatePlanService(planRepository);
    listPlans = new ListPlansService(planRepository);
    updatePlan = new UpdatePlanService(planRepository);
    deletePlan = new DeletePlanService(planRepository);
    purchasePlan = new PurchasePlanService(planRepository, purchaseRepository, paymentGateway);
    processWebhook = new ProcessPaymentWebhookService(
      purchaseRepository,
      paymentGateway,
      eventEmitter as unknown as EventEmitter2,
    );
    reconcilePayment = new ReconcilePaymentService(
      purchaseRepository,
      paymentGateway,
      eventEmitter as unknown as EventEmitter2,
    );
    getMySubscription = new GetMySubscriptionService(subscriptionRepository);
    getMyPurchase = new GetMyPurchaseService(purchaseRepository);
  });

  it('covers admin plan CRUD including inactive filtering', async () => {
    const monthly = await createPlan.execute({
      name: 'Premium Monthly',
      description: 'Monthly access',
      price: 99000,
      currency: 'vnd',
      durationDays: 30,
      features: ['AI_ADVANCED_ANALYSIS', 'PREMIUM_COURSES'],
    });

    await expect(createPlan.execute({
      name: 'Premium Monthly',
      price: 199000,
      durationDays: 60,
    })).rejects.toMatchObject({
      code: ErrorCode.SUBSCRIPTION_PLAN_ALREADY_EXISTS,
      statusCode: 409,
    });

    const updated = await updatePlan.execute(monthly.id, {
      name: 'Premium Monthly Plus',
      price: 129000,
      features: ['AI_ADVANCED_ANALYSIS', 'PREMIUM_COURSES'],
    });

    expect(updated.toProps()).toMatchObject({
      name: 'Premium Monthly Plus',
      price: 129000,
      currency: 'VND',
      features: ['AI_ADVANCED_ANALYSIS', 'PREMIUM_COURSES'],
      isActive: true,
    });

    expect(await listPlans.execute()).toHaveLength(1);

    const deactivated = await deletePlan.execute(monthly.id);
    expect(deactivated.isActive).toBe(false);
    expect(await listPlans.execute()).toHaveLength(0);
    expect(await listPlans.execute(true)).toHaveLength(1);
  });

  it('creates a purchase, processes a successful webhook, and activates a subscription', async () => {
    const plan = await createPlan.execute({
      name: 'Premium Annual',
      price: 999000,
      currency: 'VND',
      durationDays: 365,
      features: ['AI_ADVANCED_ANALYSIS', 'PREMIUM_COURSES'],
    });

    const purchase = await purchasePlan.execute('student-1', plan.id);

    expect(purchase.toProps()).toMatchObject({
      userId: 'student-1',
      planId: plan.id,
      amount: 999000,
      currency: 'VND',
      status: 'pending',
      transactionId: purchase.id,
      paymentUrl: `/mock-payment/vnpay?purchaseId=${purchase.id}`,
    });
    await expect(getMyPurchase.execute('another-student', purchase.id)).rejects.toMatchObject({
      code: ErrorCode.SUBSCRIPTION_PURCHASE_NOT_FOUND,
      statusCode: 404,
    });
    expect((await getMyPurchase.execute('student-1', purchase.id)).toProps().status).toBe('pending');

    const processed = await processWebhook.execute({
      purchaseId: purchase.id,
      transactionId: purchase.id,
      status: 'success',
      amount: '999000',
    });
    await eventEmitter.waitForLastEvent();

    expect(processed?.status).toBe('succeeded');
    expect(eventEmitter.events).toEqual([
      {
        event: 'payment.succeeded',
        payload: {
          purchaseId: purchase.id,
          userId: 'student-1',
          planId: plan.id,
        },
      },
    ]);

    const subscription = await getMySubscription.execute('student-1');
    expect(subscription?.toProps()).toMatchObject({
      userId: 'student-1',
      planId: plan.id,
      status: 'active',
    });
    expect(subscription?.expiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(userPlanAccessRepository.grants).toHaveLength(1);
    expect(userPlanAccessRepository.grants[0]).toMatchObject({
      userId: 'student-1',
      features: ['AI_ADVANCED_ANALYSIS', 'PREMIUM_COURSES'],
    });
    expect(userPlanAccessRepository.grants[0].expiresAt.getTime()).toBe(
      subscription?.expiresAt.getTime(),
    );

    const upgradedPlan = await createPlan.execute({
      name: 'Premium Plus',
      price: 1299000,
      currency: 'VND',
      durationDays: 30,
      features: ['PREMIUM_COURSES'],
    });
    const upgradedPurchase = await purchasePlan.execute('student-1', upgradedPlan.id);
    await processWebhook.execute({
      purchaseId: upgradedPurchase.id,
      transactionId: upgradedPurchase.id,
      status: 'success',
      amount: '1299000',
    });
    await eventEmitter.waitForLastEvent();

    const upgradedSubscription = await getMySubscription.execute('student-1');
    expect(upgradedSubscription?.toProps().planId).toBe(upgradedPlan.id);
    expect(upgradedSubscription?.expiresAt.getTime()).toBeGreaterThan(subscription!.expiresAt.getTime());
    expect(userPlanAccessRepository.grants).toHaveLength(2);
    expect(userPlanAccessRepository.grants[1].features).toEqual(['PREMIUM_COURSES']);

    const secondWebhookResult = await processWebhook.execute({
      purchaseId: purchase.id,
      transactionId: purchase.id,
      status: 'success',
      amount: '999000',
    });
    await eventEmitter.waitForLastEvent();

    expect(secondWebhookResult?.status).toBe('succeeded');
    expect(eventEmitter.events).toHaveLength(2);
  });

  it('rejects unverified webhooks without changing purchase or subscription state', async () => {
    const plan = await createPlan.execute({
      name: 'Premium Weekly',
      price: 49000,
      durationDays: 7,
      features: ['PREMIUM_COURSES'],
    });
    const purchase = await purchasePlan.execute('student-2', plan.id);

    await expect(processWebhook.execute({
      purchaseId: purchase.id,
      transactionId: purchase.id,
      status: 'success',
      verified: 'false',
    })).rejects.toMatchObject({
      code: ErrorCode.SUBSCRIPTION_PURCHASE_INVALID_INPUT,
      statusCode: 400,
    });

    const storedPurchase = await purchaseRepository.findById(purchase.id);
    expect(storedPurchase?.status).toBe('pending');
    expect(await getMySubscription.execute('student-2')).toBeNull();
    expect(eventEmitter.events).toHaveLength(0);
  });

  it('marks the purchase failed when paid amount does not match the plan amount', async () => {
    const plan = await createPlan.execute({
      name: 'Premium Quarter',
      price: 299000,
      durationDays: 90,
      features: ['AI_ADVANCED_ANALYSIS'],
    });
    const purchase = await purchasePlan.execute('student-3', plan.id);

    const processed = await processWebhook.execute({
      purchaseId: purchase.id,
      transactionId: purchase.id,
      status: 'success',
      amount: '1000',
    });
    await eventEmitter.waitForLastEvent();

    expect(processed?.status).toBe('failed');
    expect(await getMySubscription.execute('student-3')).toBeNull();
    expect(eventEmitter.events).toHaveLength(0);
  });

  it('reconciles a returned PayOS payment and activates the subscription', async () => {
    const plan = await createPlan.execute({
      name: 'Premium PayOS',
      price: 99000,
      durationDays: 30,
      features: ['PREMIUM_COURSES'],
    });
    const purchase = await purchasePlan.execute('student-payos', plan.id);
    paymentGateway.reconciliationResult = {
      amount: 99000,
      succeeded: true,
      terminal: true,
    };

    const reconciled = await reconcilePayment.execute('student-payos', purchase.id);
    await eventEmitter.waitForLastEvent();

    expect(reconciled.status).toBe('succeeded');
    expect((await getMySubscription.execute('student-payos'))?.toProps().status).toBe('active');
    expect(userPlanAccessRepository.grants[0]?.features).toEqual(['PREMIUM_COURSES']);
  });
});

class InMemoryPlanRepository implements IPlanRepository {
  private plans = new Map<string, PlanProps>();
  private sequence = 1;

  async findById(id: string): Promise<Plan | null> {
    const props = this.plans.get(id);
    return props ? Plan.fromPersistence(clonePlanProps(props)) : null;
  }

  async findByName(name: string): Promise<Plan | null> {
    const normalizedName = name.trim();
    const props = [...this.plans.values()].find((plan) => plan.name === normalizedName);
    return props ? Plan.fromPersistence(clonePlanProps(props)) : null;
  }

  async list(includeInactive = false): Promise<Plan[]> {
    return [...this.plans.values()]
      .filter((plan) => includeInactive || plan.isActive)
      .map((plan) => Plan.fromPersistence(clonePlanProps(plan)));
  }

  async create(plan: Plan): Promise<Plan> {
    const now = new Date();
    const props = {
      ...plan.toProps(),
      id: `plan-${this.sequence++}`,
      createdAt: now,
      updatedAt: now,
    };
    this.plans.set(props.id, clonePlanProps(props));
    return Plan.fromPersistence(clonePlanProps(props));
  }

  async update(plan: Plan): Promise<Plan> {
    const existing = this.plans.get(plan.id);
    const props = {
      ...plan.toProps(),
      createdAt: existing?.createdAt ?? new Date(),
      updatedAt: new Date(),
    };
    this.plans.set(props.id, clonePlanProps(props));
    return Plan.fromPersistence(clonePlanProps(props));
  }
}

class InMemoryPurchaseRepository implements IPurchaseRepository {
  private purchases = new Map<string, PurchaseProps>();
  private sequence = 1;

  async findById(id: string): Promise<Purchase | null> {
    const props = this.purchases.get(id);
    return props ? Purchase.fromPersistence(clonePurchaseProps(props)) : null;
  }

  async findByTransactionId(transactionId: string): Promise<Purchase | null> {
    const props = [...this.purchases.values()].find((purchase) => purchase.transactionId === transactionId);
    return props ? Purchase.fromPersistence(clonePurchaseProps(props)) : null;
  }

  async create(purchase: Purchase): Promise<Purchase> {
    const now = new Date();
    const props = {
      ...purchase.toProps(),
      id: `purchase-${this.sequence++}`,
      createdAt: now,
      updatedAt: now,
    };
    this.purchases.set(props.id, clonePurchaseProps(props));
    return Purchase.fromPersistence(clonePurchaseProps(props));
  }

  async update(purchase: Purchase): Promise<Purchase> {
    const existing = this.purchases.get(purchase.id);
    const props = {
      ...purchase.toProps(),
      createdAt: existing?.createdAt ?? new Date(),
      updatedAt: new Date(),
    };
    this.purchases.set(props.id, clonePurchaseProps(props));
    return Purchase.fromPersistence(clonePurchaseProps(props));
  }
}

class InMemorySubscriptionRepository implements ISubscriptionRepository {
  private subscriptions = new Map<string, SubscriptionProps>();
  private sequence = 1;

  async findActiveByUserId(userId: string, now: Date): Promise<Subscription | null> {
    const props = [...this.subscriptions.values()].find((subscription) =>
      subscription.userId === userId &&
      subscription.status === 'active' &&
      subscription.expiresAt > now
    );
    return props ? Subscription.fromPersistence(cloneSubscriptionProps(props)) : null;
  }

  async findLatestByUserId(userId: string): Promise<Subscription | null> {
    const props = [...this.subscriptions.values()]
      .filter((subscription) => subscription.userId === userId)
      .sort((a, b) => b.createdAt!.getTime() - a.createdAt!.getTime())[0];
    return props ? Subscription.fromPersistence(cloneSubscriptionProps(props)) : null;
  }

  async create(subscription: Subscription): Promise<Subscription> {
    const now = new Date();
    const props = {
      ...subscription.toProps(),
      id: `subscription-${this.sequence++}`,
      createdAt: now,
      updatedAt: now,
    };
    this.subscriptions.set(props.id, cloneSubscriptionProps(props));
    return Subscription.fromPersistence(cloneSubscriptionProps(props));
  }

  async update(subscription: Subscription): Promise<Subscription> {
    const existing = this.subscriptions.get(subscription.id);
    const props = {
      ...subscription.toProps(),
      createdAt: existing?.createdAt ?? new Date(),
      updatedAt: new Date(),
    };
    this.subscriptions.set(props.id, cloneSubscriptionProps(props));
    return Subscription.fromPersistence(cloneSubscriptionProps(props));
  }
}

class InMemoryUserPlanAccessRepository implements IUserPlanAccessRepository {
  grants: Array<{ userId: string; expiresAt: Date; features: string[] }> = [];

  async grantPlanAccess(userId: string, expiresAt: Date, features: string[]): Promise<void> {
    this.grants.push({ userId, expiresAt: new Date(expiresAt), features: [...features] });
  }
}

class FakePaymentGateway implements IPaymentGateway {
  reconciliationResult: PaymentReconciliationResult = {
    succeeded: false,
    terminal: false,
  };
  async createPayment(input: PaymentRequestInput): Promise<PaymentRequestResult> {
    return {
      transactionId: input.purchaseId,
      paymentUrl: `/mock-payment/vnpay?purchaseId=${input.purchaseId}`,
    };
  }

  async verifyWebhook(payload: Record<string, unknown>): Promise<PaymentWebhookResult> {
    const transactionId = String(payload.transactionId ?? payload.vnp_TxnRef ?? '');
    const purchaseId = payload.purchaseId ? String(payload.purchaseId) : undefined;
    const verified = payload.verified === 'false' ? false : true;
    const status = String(payload.status ?? '').toLowerCase();
    const responseCode = payload.vnp_ResponseCode ? String(payload.vnp_ResponseCode) : undefined;
    const amount = payload.amount ?? payload.vnp_Amount;

    return {
      transactionId,
      purchaseId,
      amount: amount === undefined ? undefined : Number(amount),
      succeeded: verified && (status === 'success' || responseCode === '00'),
      verified,
    };
  }

  async reconcilePayment(): Promise<PaymentReconciliationResult> {
    return this.reconciliationResult;
  }
}

interface PaymentSucceededEvent {
  purchaseId: string;
  userId: string;
  planId: string;
}

class CapturingEventEmitter {
  events: Array<{ event: string; payload: PaymentSucceededEvent }> = [];
  handlePaymentSucceeded?: (payload: PaymentSucceededEvent) => Promise<void>;
  private lastEventPromise: Promise<void> = Promise.resolve();

  emit(event: string, payload: PaymentSucceededEvent): boolean {
    this.events.push({ event, payload });
    if (event === 'payment.succeeded' && this.handlePaymentSucceeded) {
      this.lastEventPromise = this.handlePaymentSucceeded(payload);
    }
    return true;
  }

  waitForLastEvent(): Promise<void> {
    return this.lastEventPromise;
  }
}

function clonePlanProps(props: PlanProps): PlanProps {
  return {
    ...props,
    features: [...props.features],
    createdAt: props.createdAt ? new Date(props.createdAt) : undefined,
    updatedAt: props.updatedAt ? new Date(props.updatedAt) : undefined,
  };
}

function clonePurchaseProps(props: PurchaseProps): PurchaseProps {
  return {
    ...props,
    paidAt: props.paidAt ? new Date(props.paidAt) : undefined,
    createdAt: props.createdAt ? new Date(props.createdAt) : undefined,
    updatedAt: props.updatedAt ? new Date(props.updatedAt) : undefined,
  };
}

function cloneSubscriptionProps(props: SubscriptionProps): SubscriptionProps {
  return {
    ...props,
    startedAt: new Date(props.startedAt),
    expiresAt: new Date(props.expiresAt),
    createdAt: props.createdAt ? new Date(props.createdAt) : undefined,
    updatedAt: props.updatedAt ? new Date(props.updatedAt) : undefined,
  };
}
