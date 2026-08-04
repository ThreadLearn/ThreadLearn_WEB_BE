import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthenticatedUser } from '../../common/api-handler';
import { ApiResponse } from '../../common/api-response';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  courseIdParamSchema,
  adaptiveCourseSlugParamSchema,
  SubmitAdaptiveDiagnosticDto,
  UpdateCourseLearningGoalDto,
  UpdateLearningPlanDto,
  submitAdaptiveDiagnosticSchema,
  updateCourseLearningGoalSchema,
  updateLearningPlanSchema,
} from './learning-plan.dto';
import { CourseLearningGoalsService } from './course-learning-goals.service';
import { LearningPlansService } from './learning-plans.service';
import { AdaptiveLearningService } from './adaptive-learning.service';
import { AdaptivePlanService } from './adaptive-plan.service';

@ApiTags('Learning plan')
@Controller('v1/learning-plan')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('BearerAuth')
export class LearningPlansController {
  constructor(
    private readonly learningPlans: LearningPlansService,
    private readonly courseGoals: CourseLearningGoalsService,
    private readonly adaptiveLearning: AdaptiveLearningService,
    private readonly adaptivePlan: AdaptivePlanService
  ) {}

  @Get('me')
  async getMine(@CurrentUser() user: AuthenticatedUser) {
    return ApiResponse.success({
      message: 'Learning plan fetched.',
      data: await this.learningPlans.getMine(user.id),
    });
  }

  @Get('adaptive/diagnostic/:courseSlug')
  async getAdaptiveDiagnostic(
    @Param('courseSlug', new ZodValidationPipe(adaptiveCourseSlugParamSchema)) courseSlug: string
  ) {
    return ApiResponse.success({
      message: 'Adaptive diagnostic fetched.',
      data: await this.adaptiveLearning.getDiagnostic(courseSlug),
    });
  }

  @Post('adaptive/diagnostic/:courseSlug')
  @HttpCode(200)
  async submitAdaptiveDiagnostic(
    @CurrentUser() user: AuthenticatedUser,
    @Param('courseSlug', new ZodValidationPipe(adaptiveCourseSlugParamSchema)) courseSlug: string,
    @Body(new ZodValidationPipe(submitAdaptiveDiagnosticSchema)) body: SubmitAdaptiveDiagnosticDto
  ) {
    return ApiResponse.success({
      message: 'Adaptive diagnostic evaluated.',
      data: await this.adaptiveLearning.submitDiagnostic(user.id, courseSlug, body),
    });
  }

  @Get('adaptive/me/:courseSlug')
  async getAdaptiveProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Param('courseSlug', new ZodValidationPipe(adaptiveCourseSlugParamSchema)) courseSlug: string
  ) {
    return ApiResponse.success({
      message: 'Adaptive learning profile fetched.',
      data: await this.adaptiveLearning.getMine(user.id, courseSlug),
    });
  }

  @Post('adaptive/plan/:courseSlug')
  @HttpCode(200)
  async generateAdaptivePlan(
    @CurrentUser() user: AuthenticatedUser,
    @Param('courseSlug', new ZodValidationPipe(adaptiveCourseSlugParamSchema)) courseSlug: string
  ) {
    return ApiResponse.success({
      message: 'Adaptive learning plan generated.',
      data: await this.adaptivePlan.generate(user.id, courseSlug),
    });
  }

  @Get('adaptive/plan/:courseSlug')
  async getAdaptivePlan(
    @CurrentUser() user: AuthenticatedUser,
    @Param('courseSlug', new ZodValidationPipe(adaptiveCourseSlugParamSchema)) courseSlug: string
  ) {
    return ApiResponse.success({
      message: 'Adaptive learning plan fetched.',
      data: await this.adaptivePlan.getLatest(user.id, courseSlug),
    });
  }

  @Get('adaptive/plan/:courseSlug/history')
  async getAdaptivePlanHistory(
    @CurrentUser() user: AuthenticatedUser,
    @Param('courseSlug', new ZodValidationPipe(adaptiveCourseSlugParamSchema)) courseSlug: string
  ) {
    return ApiResponse.success({
      message: 'Adaptive learning plan history fetched.',
      data: await this.adaptivePlan.getHistory(user.id, courseSlug),
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
