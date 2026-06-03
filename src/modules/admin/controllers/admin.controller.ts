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
import { User } from '../../auth/models/user.model';
import { CodeExecutionService } from '../../code-execution/services/code-execution.service';
import { AnalyticsService } from '../../analytics/services/analytics.service';
import { Course } from '../../courses/models/course.model';
import { Enrollment } from '../../enrollments/models/enrollment.model';
import { QuizAttempt } from '../../quiz-attempts/models/quiz-attempt.model';
import { AdminService } from '../services/admin.service';
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
  @Post('students')
  @ApiOperation({ summary: 'Create a student account.' })
  async createStudent(
    @CurrentUser() admin: AuthenticatedUser,
    @Body(new ZodValidationPipe(createStudentSchema))
    body: { email: string; password?: string; firstName: string; lastName: string }
  ) {
    await this.ensureAdminCanManageStudents(admin);
    const result = await AdminService.createStudent(body);
    return ApiResponse.success({
      message: result.temporaryPasswordSent
        ? 'Student created successfully. Temporary password was sent by email.'
        : 'Student created successfully.',
      data: result.student,
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
    await this.ensureAdminCanManageStudents(admin);
    const result = await AdminService.listStudents(query);
    return ApiResponse.success({
      message: 'Students retrieved successfully.',
      data: result.items,
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
    await this.ensureAdminCanManageStudents(admin);
    const student = await AdminService.updateStudent(studentId, body);
    return ApiResponse.success({
      message: 'Student updated successfully.',
      data: student,
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
    await this.ensureAdminCanManageStudents(admin);
    const student = await AdminService.lockStudent(studentId, body.lockedReason);
    return ApiResponse.success({
      message: 'Student locked successfully.',
      data: student,
    });
  }

  @Patch('students/:id/unlock')
  @ApiOperation({ summary: 'Unlock a student account.' })
  async unlockStudent(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id', new ZodValidationPipe(objectIdParamSchema)) studentId: string
  ) {
    await this.ensureAdminCanManageStudents(admin);
    const student = await AdminService.unlockStudent(studentId);
    return ApiResponse.success({
      message: 'Student unlocked successfully.',
      data: student,
    });
  }

  @Get('stats')
  async getStats(@CurrentUser() admin: AuthenticatedUser) {
    await this.ensureAdminCanManageStudents(admin);
    const [totalUsers, totalCourses, totalEnrollments, totalAttempts] = await Promise.all([
      User.countDocuments(),
      Course.countDocuments(),
      Enrollment.countDocuments(),
      QuizAttempt.countDocuments(),
    ]);

    return ApiResponse.success({
      message: 'Admin dashboard statistics retrieved.',
      data: {
        totalUsers,
        totalCourses,
        totalEnrollments,
        totalQuizAttempts: totalAttempts,
      },
    });
  }

  @Get('dashboard/statistics')
  @ApiOperation({ summary: 'Get admin dashboard statistics and chart data.' })
  async getDashboardStatistics(
    @CurrentUser() admin: AuthenticatedUser,
    @Query(new ZodValidationPipe(dashboardStatisticsQuerySchema))
    query: { from?: string; to?: string; months: number }
  ) {
    await this.ensureAdminCanManageStudents(admin);
    const statistics = await AnalyticsService.getAdminDashboardStatistics(query);
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
    const result = await CodeExecutionService.executeCode(admin.id, body);
    return ApiResponse.success({
      message: 'Code execution completed.',
      data: result,
    });
  }

  private async ensureAdminCanManageStudents(admin?: AuthenticatedUser) {
    if (!admin) {
      throw new BadRequestError('Admin context not found.');
    }

    await AdminService.ensureActiveAdmin(admin.id);
  }
}
