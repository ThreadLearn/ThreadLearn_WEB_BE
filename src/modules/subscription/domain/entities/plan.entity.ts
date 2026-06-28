import { DomainError, ErrorCode } from '../../../../shared/errors/error-codes';

export interface PlanProps {
  id: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  durationDays: number;
  features: string[];
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreatePlanInput {
  name: string;
  description?: string;
  price: number;
  currency?: string;
  durationDays: number;
  features?: string[];
  isActive?: boolean;
}

export interface PlanEditableProps {
  name?: string;
  description?: string;
  price?: number;
  currency?: string;
  durationDays?: number;
  features?: string[];
  isActive?: boolean;
}

export class Plan {
  private constructor(private readonly props: PlanProps) {}

  static createNew(input: CreatePlanInput): Plan {
    const props: PlanProps = {
      id: '',
      name: input.name?.trim(),
      description: input.description?.trim(),
      price: input.price,
      currency: (input.currency ?? 'VND').trim().toUpperCase(),
      durationDays: input.durationDays,
      features: input.features ?? [],
      isActive: input.isActive ?? true,
    };
    Plan.validate(props);
    return new Plan(props);
  }

  static fromPersistence(props: PlanProps): Plan {
    Plan.validate(props);
    return new Plan(props);
  }

  get id(): string { return this.props.id; }
  get name(): string { return this.props.name; }
  get isActive(): boolean { return this.props.isActive; }

  applyEdits(patch: PlanEditableProps): void {
    if (patch.name !== undefined) this.props.name = patch.name.trim();
    if (patch.description !== undefined) this.props.description = patch.description?.trim();
    if (patch.price !== undefined) this.props.price = patch.price;
    if (patch.currency !== undefined) this.props.currency = patch.currency.trim().toUpperCase();
    if (patch.durationDays !== undefined) this.props.durationDays = patch.durationDays;
    if (patch.features !== undefined) this.props.features = patch.features;
    if (patch.isActive !== undefined) this.props.isActive = patch.isActive;
    Plan.validate(this.props);
  }

  deactivate(): void {
    this.props.isActive = false;
  }

  toProps(): PlanProps {
    return { ...this.props, features: [...this.props.features] };
  }

  private static validate(props: PlanProps): void {
    if (!props.name?.trim()) {
      throw DomainError.badRequest(ErrorCode.SUBSCRIPTION_PLAN_INVALID_INPUT, 'Plan name is required.');
    }
    if (props.price < 0) {
      throw DomainError.badRequest(ErrorCode.SUBSCRIPTION_PLAN_INVALID_INPUT, 'Plan price cannot be negative.');
    }
    if (!Number.isInteger(props.durationDays) || props.durationDays <= 0) {
      throw DomainError.badRequest(ErrorCode.SUBSCRIPTION_PLAN_INVALID_INPUT, 'Plan duration must be a positive number of days.');
    }
    if (!props.currency?.trim()) {
      throw DomainError.badRequest(ErrorCode.SUBSCRIPTION_PLAN_INVALID_INPUT, 'Plan currency is required.');
    }
  }
}
