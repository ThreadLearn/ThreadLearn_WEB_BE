import {
  Controller, Get, Post, Body, Param, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { EnrollmentsService } from '../services/enrollments.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../../../common/decorators/current-user.decorator';
import { EnrollDto } from '../dto/enrollment.dto';

@ApiTags('enrollments')
@Controller('enrollments')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class EnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  @Post()
  @Roles('STUDENT')
  @ApiOperation({ summary: 'UC26 — enroll in a course (Student).' })
  async enroll(@Body() dto: EnrollDto, @CurrentUser() user: JwtPayload) {
    const data = await this.enrollmentsService.enrollInCourse(user.id, dto.courseId);
    return { message: 'Enrolled successfully.', data, statusCode: 201 };
  }

  @Get('me')
  @Roles('STUDENT', 'ADMIN')
  @ApiOperation({ summary: 'UC28 — list my enrollments with progress.' })
  async listMine(@CurrentUser() user: JwtPayload) {
    const data = await this.enrollmentsService.getMyEnrollments(user.id);
    return { message: 'Enrollments fetched.', data };
  }

  @Get('me/progress/:courseId')
  @Roles('STUDENT', 'ADMIN')
  @ApiOperation({ summary: 'UC28 — detailed progress for one course.' })
  async progress(
    @Param('courseId') courseId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.enrollmentsService.getCourseProgress(user.id, courseId);
    return { message: 'Progress fetched.', data };
  }
}
