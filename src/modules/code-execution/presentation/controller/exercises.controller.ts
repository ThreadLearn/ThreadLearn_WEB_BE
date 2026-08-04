import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedUser } from '../../../../common/api-handler';
import { ApiResponse } from '../../../../common/api-response';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { Roles } from '../../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { ZodValidationPipe } from '../../../../common/pipes/zod-validation.pipe';
import {
  AssignmentRunPayload,
  AssignmentSubmitPayload,
  ExerciseUpsertPayload,
  ExerciseUpdatePayload,
  SubmissionListQuery,
  assignmentRunSchema,
  assignmentSubmitSchema,
  exerciseCreateSchema,
  exerciseIdParamSchema,
  exerciseListQuerySchema,
  exerciseUpdateSchema,
  submissionListQuerySchema,
} from '../../application/dto/exercise.dto';
import { ExercisesService } from '../../application/services/exercises.service';

@ApiTags('Code Assignments')
@Controller(['v1/exercises', 'v1/code-assignments'])
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('BearerAuth')
export class ExercisesController {
  constructor(private readonly exercises: ExercisesService) {}

  @Get()
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(exerciseListQuerySchema)) query: { lessonId: string },
  ) {
    const data = await this.exercises.listByLesson(user, query.lessonId);
    return ApiResponse.success({ message: 'Code assignments fetched.', data });
  }

  @Get('admin/all')
  @Roles('ADMIN', 'INSTRUCTOR')
  async listAllForManagement(@CurrentUser() user: AuthenticatedUser) {
    const data = await this.exercises.listAllForManagement(user);
    return ApiResponse.success({ message: 'Code assignments fetched.', data });
  }

  @Get(':id/submissions/me')
  async listMine(
    @Param('id', new ZodValidationPipe(exerciseIdParamSchema)) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(submissionListQuerySchema)) query: SubmissionListQuery,
  ) {
    const data = await this.exercises.listMine(user, id, query.page, query.limit);
    return ApiResponse.success({ message: 'Submission history fetched.', data });
  }

  @Get(':id/submissions')
  @Roles('ADMIN', 'INSTRUCTOR')
  async listForAdmin(
    @Param('id', new ZodValidationPipe(exerciseIdParamSchema)) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(submissionListQuerySchema)) query: SubmissionListQuery,
  ) {
    const data = await this.exercises.listForManagement(user, id, query.page, query.limit);
    return ApiResponse.success({ message: 'Assignment submissions fetched.', data });
  }

  @Get('submissions/:submissionId')
  async getMine(@Param('submissionId', new ZodValidationPipe(exerciseIdParamSchema)) submissionId: string, @CurrentUser() user: AuthenticatedUser) {
    const data = await this.exercises.getMine(user, submissionId);
    return ApiResponse.success({ message: 'Submission fetched.', data });
  }

  @Post(':id/run-public')
  async runPublic(
    @Param('id', new ZodValidationPipe(exerciseIdParamSchema)) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(assignmentRunSchema)) body: AssignmentRunPayload,
  ) {
    const data = await this.exercises.runPublic(user, id, body);
    return ApiResponse.success({ message: 'Public test cases completed.', data });
  }

  @Post(':id/submit')
  async submit(
    @Param('id', new ZodValidationPipe(exerciseIdParamSchema)) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(assignmentSubmitSchema)) body: AssignmentSubmitPayload,
  ) {
    const data = await this.exercises.submit(user, id, body);
    return ApiResponse.success({ message: 'Assignment submitted.', data, statusCode: 201 });
  }

  @Get(':id')
  async getOne(@Param('id', new ZodValidationPipe(exerciseIdParamSchema)) id: string, @CurrentUser() user: AuthenticatedUser) {
    const data = await this.exercises.getById(user, id);
    return ApiResponse.success({ message: 'Code assignment fetched.', data });
  }

  @Post()
  @Roles('ADMIN', 'INSTRUCTOR')
  async create(@CurrentUser() user: AuthenticatedUser, @Body(new ZodValidationPipe(exerciseCreateSchema)) body: ExerciseUpsertPayload) {
    const data = await this.exercises.create(user, body);
    return ApiResponse.success({ message: 'Code assignment created.', data, statusCode: 201 });
  }

  @Patch(':id')
  @Roles('ADMIN', 'INSTRUCTOR')
  async update(
    @Param('id', new ZodValidationPipe(exerciseIdParamSchema)) id: string,
    @Body(new ZodValidationPipe(exerciseUpdateSchema)) body: ExerciseUpdatePayload,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.exercises.update(user, id, body);
    return ApiResponse.success({ message: 'Code assignment updated.', data });
  }

  @Delete(':id')
  @Roles('ADMIN', 'INSTRUCTOR')
  async remove(@Param('id', new ZodValidationPipe(exerciseIdParamSchema)) id: string, @CurrentUser() user: AuthenticatedUser) {
    const data = await this.exercises.remove(user, id);
    return ApiResponse.success({ message: 'Code assignment deleted.', data });
  }
}

export default ExercisesController;
