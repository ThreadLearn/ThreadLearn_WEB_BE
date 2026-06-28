import { Plan } from '../entities/plan.entity';

export interface IPlanRepository {
  findById(id: string): Promise<Plan | null>;
  findByName(name: string): Promise<Plan | null>;
  list(includeInactive?: boolean): Promise<Plan[]>;
  create(plan: Plan): Promise<Plan>;
  update(plan: Plan): Promise<Plan>;
}

export const PLAN_REPOSITORY = Symbol('PLAN_REPOSITORY');
