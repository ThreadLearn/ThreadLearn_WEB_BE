import { Inject, Injectable } from '@nestjs/common';
import { DomainError, ErrorCode } from '../../../../shared/errors/error-codes';
import { Plan } from '../../domain/entities/plan.entity';
import { IPlanRepository, PLAN_REPOSITORY } from '../../domain/interfaces/plan.repository';

@Injectable()
export class DeletePlanService {
  constructor(@Inject(PLAN_REPOSITORY) private readonly planRepository: IPlanRepository) {}

  async execute(id: string): Promise<Plan> {
    const plan = await this.planRepository.findById(id);
    if (!plan) {
      throw DomainError.notFound(ErrorCode.SUBSCRIPTION_PLAN_NOT_FOUND, 'Subscription plan not found.');
    }
    plan.deactivate();
    return this.planRepository.update(plan);
  }
}
