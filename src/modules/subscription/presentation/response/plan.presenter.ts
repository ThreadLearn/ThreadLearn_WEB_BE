import { Plan } from '../../domain/entities/plan.entity';
import { SUBSCRIPTION_FEATURES } from '../../../../shared/domain/subscription-features';

export class PlanPresenter {
  static toResponse(plan: Plan) {
    const p = plan.toProps();
    return {
      _id: p.id,
      id: p.id,
      name: p.name,
      description: p.description,
      price: p.price,
      currency: p.currency,
      durationDays: p.durationDays,
      features: p.features,
      featureDetails: p.features.map((feature) =>
        SUBSCRIPTION_FEATURES.find((candidate) => candidate.key === feature),
      ),
      isActive: p.isActive,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    };
  }

  static toList(plans: Plan[]) {
    return plans.map((plan) => PlanPresenter.toResponse(plan));
  }
}
