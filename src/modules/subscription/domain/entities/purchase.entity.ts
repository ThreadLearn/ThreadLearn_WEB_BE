import { DomainError, ErrorCode } from '../../../../shared/errors/error-codes';

export type PurchaseStatus = 'pending' | 'succeeded' | 'failed';

export interface PurchaseProps {
  id: string;
  userId: string;
  planId: string;
  amount: number;
  currency: string;
  status: PurchaseStatus;
  transactionId?: string;
  paymentUrl?: string;
  paidAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Purchase {
  private constructor(private readonly props: PurchaseProps) {}

  static createNew(input: {
    userId: string;
    planId: string;
    amount: number;
    currency: string;
  }): Purchase {
    const purchase = new Purchase({
      id: '',
      userId: input.userId,
      planId: input.planId,
      amount: input.amount,
      currency: input.currency,
      status: 'pending',
    });
    Purchase.validate(purchase.props);
    return purchase;
  }

  static fromPersistence(props: PurchaseProps): Purchase {
    Purchase.validate(props);
    return new Purchase(props);
  }

  get id(): string { return this.props.id; }
  get userId(): string { return this.props.userId; }
  get planId(): string { return this.props.planId; }
  get status(): PurchaseStatus { return this.props.status; }
  get transactionId(): string | undefined { return this.props.transactionId; }

  attachPayment(input: { transactionId: string; paymentUrl: string }): void {
    this.props.transactionId = input.transactionId;
    this.props.paymentUrl = input.paymentUrl;
  }

  markSucceeded(now: Date): void {
    this.props.status = 'succeeded';
    this.props.paidAt = now;
  }

  markFailed(): void {
    this.props.status = 'failed';
  }

  toProps(): PurchaseProps {
    return { ...this.props };
  }

  private static validate(props: PurchaseProps): void {
    if (!props.userId || !props.planId) {
      throw DomainError.badRequest(ErrorCode.SUBSCRIPTION_PURCHASE_INVALID_INPUT, 'Purchase user and plan are required.');
    }
    if (props.amount < 0) {
      throw DomainError.badRequest(ErrorCode.SUBSCRIPTION_PURCHASE_INVALID_INPUT, 'Purchase amount cannot be negative.');
    }
    if (!props.currency?.trim()) {
      throw DomainError.badRequest(ErrorCode.SUBSCRIPTION_PURCHASE_INVALID_INPUT, 'Purchase currency is required.');
    }
  }
}
