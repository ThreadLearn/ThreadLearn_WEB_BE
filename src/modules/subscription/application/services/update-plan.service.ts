import { Inject, Injectable } from '@nestjs/common';
import { DomainError, ErrorCode } from '../../../../shared/errors/error-codes';
import { Plan } from '../../domain/entities/plan.entity';
import { IPlanRepository, PLAN_REPOSITORY } from '../../domain/interfaces/plan.repository';
import { UpdatePlanDto } from '../dto/plan.dto';

@Injectable()
export class UpdatePlanService {
  constructor(@Inject(PLAN_REPOSITORY) private readonly planRepository: IPlanRepository) {}

  async execute(id: string, input: UpdatePlanDto): Promise<Plan> {
    const plan = await this.planRepository.findById(id);
    if (!plan) {
      throw DomainError.notFound(ErrorCode.SUBSCRIPTION_PLAN_NOT_FOUND, 'Subscription plan not found.');
    }

    if (input.name && input.name.trim() !== plan.name) {
      const existing = await this.planRepository.findByName(input.name);
      if (existing && existing.id !== plan.id) {
        throw DomainError.conflict(ErrorCode.SUBSCRIPTION_PLAN_ALREADY_EXISTS, 'A subscription plan with this name already exists.');
      }
    }

    plan.applyEdits(input);
    return this.planRepository.update(plan);
  }
}
