import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { AuthenticatedUser } from '../../../common/api-handler';
import { ApiResponse } from '../../../common/api-response';
import { BadRequestError } from '../../../common/custom-error';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { CodeExecutionService } from '../../code-execution/application/services/code-execution.service';
import {
  AddStudentService,
  GetAdminBasicStatsService,
  GetAdminDashboardStatisticsService,
  GetStudentListService,
  LockStudentService,
  UnlockStudentService,
  UpdateStudentInfoService,
} from '../application/services';
import {
  createStudentSchema,
  dashboardStatisticsQuerySchema,
  listStudentsQuerySchema,
  lockStudentSchema,
  objectIdParamSchema,
  updateStudentSchema,
} from '../validators/admin.validator';

const executeSchema = z.object({
  sourceCode: z.string().min(1, 'Source code is required.'),
  languageId: z.number().int().positive('Language ID must be a positive integer.'),
  stdin: z.string().optional(),
});

@ApiTags('Admin')
@Controller('v1/admin')
@UseGuards(JwtAuthGuard)
@Roles('ADMIN')
@ApiBearerAuth('BearerAuth')
export class AdminController {
  constructor(
    private readonly codeExecution: CodeExecutionService,
    private readonly addStudentService: AddStudentService,
    private readonly lockStudentService: LockStudentService,
    private readonly unlockStudentService: UnlockStudentService,
    private readonly getStudentListService: GetStudentListService,
    private readonly updateStudentInfoService: UpdateStudentInfoService,
    private readonly getAdminBasicStatsService: GetAdminBasicStatsService,
    private readonly getAdminDashboardStatisticsService: GetAdminDashboardStatisticsService
  ) {}

  @Post('students')
  @ApiOperation({ summary: 'Create a student account.' })
  async createStudent(
    @CurrentUser() admin: AuthenticatedUser,
    @Body(new ZodValidationPipe(createStudentSchema))
    body: { email: string; password?: string; firstName: string; lastName: string }
  ) {
    const result = await this.addStudentService.execute({
      adminId: this.getAdminId(admin),
      email: body.email,
      password: body.password,
      firstName: body.firstName,
      lastName: body.lastName,
    });
    return ApiResponse.success({
      message: result.temporaryPasswordSent
        ? 'Student created successfully. Temporary password was sent by email.'
        : 'Student created successfully.',
      data: result.user,
      statusCode: 201,
    });
  }

  @Get('students')
  @ApiOperation({ summary: 'List student accounts.' })
  async listStudents(
    @CurrentUser() admin: AuthenticatedUser,
    @Query(new ZodValidationPipe(listStudentsQuerySchema))
    query: { page: number; limit: number; search?: string; isActive?: boolean; isVerified?: boolean }
  ) {
    const result = await this.getStudentListService.execute({
      adminId: this.getAdminId(admin),
      page: query.page,
      limit: query.limit,
      search: query.search,
      isActive: query.isActive,
      isVerified: query.isVerified,
    });
    return ApiResponse.success({
      message: 'Students retrieved successfully.',
      data: result.students,
      meta: result.meta,
    });
  }

  @Patch('students/:id')
  @ApiOperation({ summary: 'Update a student account.' })
  async updateStudent(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id', new ZodValidationPipe(objectIdParamSchema)) studentId: string,
    @Body(new ZodValidationPipe(updateStudentSchema))
    body: { firstName?: string; lastName?: string; avatarUrl?: string; isVerified?: boolean }
  ) {
    const result = await this.updateStudentInfoService.execute({
      adminId: this.getAdminId(admin),
      studentId,
      firstName: body.firstName,
      lastName: body.lastName,
      avatarUrl: body.avatarUrl,
      isVerified: body.isVerified,
    });
    return ApiResponse.success({
      message: 'Student updated successfully.',
      data: result.user,
    });
  }

  @Patch('students/:id/lock')
  @ApiOperation({ summary: 'Lock a student account.' })
  async lockStudent(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id', new ZodValidationPipe(objectIdParamSchema)) studentId: string,
    @Body(new ZodValidationPipe(lockStudentSchema))
    body: { lockedReason?: string }
  ) {
    const result = await this.lockStudentService.execute({
      adminId: this.getAdminId(admin),
      studentId,
      lockedReason: body.lockedReason,
    });
    return ApiResponse.success({
      message: 'Student locked successfully.',
      data: result.user,
    });
  }

  @Patch('students/:id/unlock')
  @ApiOperation({ summary: 'Unlock a student account.' })
  async unlockStudent(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id', new ZodValidationPipe(objectIdParamSchema)) studentId: string
  ) {
    const result = await this.unlockStudentService.execute({
      adminId: this.getAdminId(admin),
      studentId,
    });
    return ApiResponse.success({
      message: 'Student unlocked successfully.',
      data: result.user,
    });
  }

  @Get('stats')
  async getStats(@CurrentUser() admin: AuthenticatedUser) {
    const stats = await this.getAdminBasicStatsService.execute({
      adminId: this.getAdminId(admin),
    });

    return ApiResponse.success({
      message: 'Admin dashboard statistics retrieved.',
      data: stats,
    });
  }

  @Get('dashboard/statistics')
  @ApiOperation({ summary: 'Get admin dashboard statistics and chart data.' })
  async getDashboardStatistics(
    @CurrentUser() admin: AuthenticatedUser,
    @Query(new ZodValidationPipe(dashboardStatisticsQuerySchema))
    query: { from?: string; to?: string; months: number }
  ) {
    const statistics = await this.getAdminDashboardStatisticsService.execute({
      adminId: this.getAdminId(admin),
      from: query.from,
      to: query.to,
      months: query.months,
    });
    return ApiResponse.success({
      message: 'Admin dashboard statistics retrieved.',
      data: statistics,
    });
  }

  @Post('execute')
  @HttpCode(200)
  async executeCode(
    @CurrentUser() admin: AuthenticatedUser,
    @Body(new ZodValidationPipe(executeSchema))
    body: { sourceCode: string; languageId: number; stdin?: string }
  ) {
    const result = await this.codeExecution.executeCode(admin.id, body, admin.role);
    return ApiResponse.success({
      message: 'Code execution completed.',
      data: result,
    });
  }

  private getAdminId(admin?: AuthenticatedUser) {
    if (!admin) {
      throw new BadRequestError('Admin context not found.');
    }
    return admin.id;
  }
}
