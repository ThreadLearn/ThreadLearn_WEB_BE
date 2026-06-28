import { Inject, Injectable } from '@nestjs/common';
import { DomainError, ErrorCode } from '../../../../shared/errors/error-codes';
import { Plan } from '../../domain/entities/plan.entity';
import { IPlanRepository, PLAN_REPOSITORY } from '../../domain/interfaces/plan.repository';
import { CreatePlanDto } from '../dto/plan.dto';

@Injectable()
export class CreatePlanService {
  constructor(@Inject(PLAN_REPOSITORY) private readonly planRepository: IPlanRepository) {}

  async execute(input: CreatePlanDto): Promise<Plan> {
    const existing = await this.planRepository.findByName(input.name);
    if (existing) {
      throw DomainError.conflict(ErrorCode.SUBSCRIPTION_PLAN_ALREADY_EXISTS, 'A subscription plan with this name already exists.');
    }
    return this.planRepository.create(Plan.createNew(input));
  }
}
