import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiResponse } from '../../../../common/api-response';
import { Roles } from '../../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { ZodValidationPipe } from '../../../../common/pipes/zod-validation.pipe';
import {
  CreatePlanDto,
  ListPlansQueryDto,
  UpdatePlanDto,
  createPlanSchema,
  listPlansQuerySchema,
  planIdParamSchema,
  updatePlanSchema,
} from '../../application/dto/plan.dto';
import { CreatePlanService } from '../../application/services/create-plan.service';
import { DeletePlanService } from '../../application/services/delete-plan.service';
import { GetPlanService } from '../../application/services/get-plan.service';
import { ListPlansService } from '../../application/services/list-plans.service';
import { UpdatePlanService } from '../../application/services/update-plan.service';
import { PlanPresenter } from '../response/plan.presenter';

@ApiTags('Subscription Plans')
@Controller('v1/subscription/plans')
@UseGuards(JwtAuthGuard)
@Roles('ADMIN')
@ApiBearerAuth('BearerAuth')
export class PlanController {
  constructor(
    private readonly createPlan: CreatePlanService,
    private readonly updatePlan: UpdatePlanService,
    private readonly deletePlan: DeletePlanService,
    private readonly getPlan: GetPlanService,
    private readonly listPlans: ListPlansService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'UC51 — create subscription plan.' })
  async create(@Body(new ZodValidationPipe(createPlanSchema)) body: CreatePlanDto) {
    const plan = await this.createPlan.execute(body);
    return ApiResponse.success({
      message: 'Subscription plan created successfully.',
      data: PlanPresenter.toResponse(plan),
      statusCode: 201,
    });
  }

  @Get()
  @ApiOperation({ summary: 'UC51 — list subscription plans.' })
  async list(@Query(new ZodValidationPipe(listPlansQuerySchema)) query: ListPlansQueryDto) {
    const plans = await this.listPlans.execute(query.includeInactive);
    return ApiResponse.success({
      message: 'Subscription plans fetched successfully.',
      data: PlanPresenter.toList(plans),
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'UC51 — get subscription plan detail.' })
  async detail(@Param('id', new ZodValidationPipe(planIdParamSchema)) id: string) {
    const plan = await this.getPlan.execute(id);
    return ApiResponse.success({
      message: 'Subscription plan fetched successfully.',
      data: PlanPresenter.toResponse(plan),
    });
  }

  @Put(':id')
  @ApiOperation({ summary: 'UC51 — update subscription plan.' })
  async update(
    @Param('id', new ZodValidationPipe(planIdParamSchema)) id: string,
    @Body(new ZodValidationPipe(updatePlanSchema)) body: UpdatePlanDto,
  ) {
    const plan = await this.updatePlan.execute(id, body);
    return ApiResponse.success({
      message: 'Subscription plan updated successfully.',
      data: PlanPresenter.toResponse(plan),
    });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'UC51 — deactivate subscription plan.' })
  async remove(@Param('id', new ZodValidationPipe(planIdParamSchema)) id: string) {
    const plan = await this.deletePlan.execute(id);
    return ApiResponse.success({
      message: 'Subscription plan deactivated successfully.',
      data: PlanPresenter.toResponse(plan),
    });
  }
}
