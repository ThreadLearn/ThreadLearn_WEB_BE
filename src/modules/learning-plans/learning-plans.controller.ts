import { Body, Controller, Delete, Get, Param, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthenticatedUser } from '../../common/api-handler';
import { ApiResponse } from '../../common/api-response';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  courseIdParamSchema,
  UpdateCourseLearningGoalDto,
  UpdateLearningPlanDto,
  updateCourseLearningGoalSchema,
  updateLearningPlanSchema,
} from './learning-plan.dto';
import { CourseLearningGoalsService } from './course-learning-goals.service';
import { LearningPlansService } from './learning-plans.service';

@ApiTags('Learning plan')
@Controller('v1/learning-plan')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('BearerAuth')
export class LearningPlansController {
  constructor(
    private readonly learningPlans: LearningPlansService,
    private readonly courseGoals: CourseLearningGoalsService
  ) {}

  @Get('me')
  async getMine(@CurrentUser() user: AuthenticatedUser) {
    return ApiResponse.success({
      message: 'Learning plan fetched.',
      data: await this.learningPlans.getMine(user.id),
    });
  }

  @Put('me')
  async updateMine(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(updateLearningPlanSchema)) body: UpdateLearningPlanDto
  ) {
    return ApiResponse.success({
      message: 'Learning plan updated.',
      data: await this.learningPlans.updateMine(user.id, body),
    });
  }

  @Get('goals')
  async listGoals(@CurrentUser() user: AuthenticatedUser) {
    return ApiResponse.success({
      message: 'Course goals fetched.',
      data: await this.courseGoals.listMine(user.id),
    });
  }

  @Get('goals/:courseId')
  async getGoal(
    @CurrentUser() user: AuthenticatedUser,
    @Param('courseId', new ZodValidationPipe(courseIdParamSchema)) courseId: string
  ) {
    return ApiResponse.success({
      message: 'Course goal fetched.',
      data: await this.courseGoals.getMine(user.id, courseId),
    });
  }

  @Put('goals/:courseId')
  async updateGoal(
    @CurrentUser() user: AuthenticatedUser,
    @Param('courseId', new ZodValidationPipe(courseIdParamSchema)) courseId: string,
    @Body(new ZodValidationPipe(updateCourseLearningGoalSchema)) body: UpdateCourseLearningGoalDto
  ) {
    return ApiResponse.success({
      message: 'Course goal updated.',
      data: await this.courseGoals.upsertMine(user.id, courseId, body),
    });
  }

  @Delete('goals/:courseId')
  async removeGoal(
    @CurrentUser() user: AuthenticatedUser,
    @Param('courseId', new ZodValidationPipe(courseIdParamSchema)) courseId: string
  ) {
    return ApiResponse.success({
      message: 'Course goal removed.',
      data: await this.courseGoals.removeMine(user.id, courseId),
    });
  }
}
