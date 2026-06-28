import { Inject, Injectable } from '@nestjs/common';
import { Plan } from '../../domain/entities/plan.entity';
import { IPlanRepository, PLAN_REPOSITORY } from '../../domain/interfaces/plan.repository';

@Injectable()
export class ListPlansService {
  constructor(@Inject(PLAN_REPOSITORY) private readonly planRepository: IPlanRepository) {}

  async execute(includeInactive = false): Promise<Plan[]> {
    return this.planRepository.list(includeInactive);
  }
}
