import { Plan } from '../../domain/entities/plan.entity';

export class PlanMapper {
  static toEntity(doc: any): Plan {
    return Plan.fromPersistence({
      id: String(doc._id),
      name: doc.name,
      description: doc.description,
      price: doc.price,
      currency: doc.currency,
      durationDays: doc.durationDays,
      features: doc.features ?? [],
      isActive: doc.isActive,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  }

  static toPersistence(plan: Plan): Record<string, any> {
    const p = plan.toProps();
    return {
      name: p.name,
      description: p.description,
      price: p.price,
      currency: p.currency,
      durationDays: p.durationDays,
      features: p.features,
      isActive: p.isActive,
    };
  }
}
