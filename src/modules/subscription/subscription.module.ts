import { Module } from '@nestjs/common';
import { CreatePlanService } from './application/services/create-plan.service';
import { DeletePlanService } from './application/services/delete-plan.service';
import { GetPlanService } from './application/services/get-plan.service';
import { ListPlansService } from './application/services/list-plans.service';
import { UpdatePlanService } from './application/services/update-plan.service';
import { PLAN_REPOSITORY } from './domain/interfaces/plan.repository';
import { MongoPlanRepository } from './infrastructure/persistence/mongo-plan.repository';
import { PlanController } from './presentation/controller/plan.controller';

@Module({
  controllers: [PlanController],
  providers: [
    MongoPlanRepository,
    { provide: PLAN_REPOSITORY, useExisting: MongoPlanRepository },
    CreatePlanService,
    UpdatePlanService,
    DeletePlanService,
    GetPlanService,
    ListPlansService,
  ],
  exports: [PLAN_REPOSITORY],
})
export class SubscriptionModule {}
