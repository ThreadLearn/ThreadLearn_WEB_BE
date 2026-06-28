export type SubscriptionStatus = 'active' | 'expired' | 'cancelled';

export interface SubscriptionProps {
  id: string;
  userId: string;
  planId: string;
  status: SubscriptionStatus;
  startedAt: Date;
  expiresAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Subscription {
  private constructor(private readonly props: SubscriptionProps) {}

  static createActive(input: {
    userId: string;
    planId: string;
    durationDays: number;
    now: Date;
  }): Subscription {
    return new Subscription({
      id: '',
      userId: input.userId,
      planId: input.planId,
      status: 'active',
      startedAt: input.now,
      expiresAt: Subscription.addDays(input.now, input.durationDays),
    });
  }

  static fromPersistence(props: SubscriptionProps): Subscription {
    return new Subscription(props);
  }

  get id(): string { return this.props.id; }
  get userId(): string { return this.props.userId; }
  get status(): SubscriptionStatus { return this.props.status; }
  get expiresAt(): Date { return this.props.expiresAt; }

  extend(planId: string, durationDays: number, now: Date): void {
    const base = this.props.expiresAt > now ? this.props.expiresAt : now;
    this.props.planId = planId;
    this.props.status = 'active';
    this.props.expiresAt = Subscription.addDays(base, durationDays);
  }

  toProps(): SubscriptionProps {
    return { ...this.props };
  }

  private static addDays(date: Date, days: number): Date {
    return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
  }
}
