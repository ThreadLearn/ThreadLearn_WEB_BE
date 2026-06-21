import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiBearerAuth } from '@nestjs/swagger';
import { AuthenticatedUser } from '../../../common/api-handler';
import { ApiResponse } from '../../../common/api-response';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { NotFoundError } from '../../../common/custom-error';
import { EnrollmentsService } from '../services/enrollments.service';

@ApiTags('Enrollments')
@Controller('v1/enrollments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('BearerAuth')
export class EnrollmentsController {
  @Post()
  async enroll(@CurrentUser() user: AuthenticatedUser, @Body() body: { courseId: string }) {
    const enrollment = await EnrollmentsService.enrollInCourse(user.id, body.courseId);
    return ApiResponse.success({ message: 'Course enrolled.', data: enrollment, statusCode: 201 });
  }

  @Get('me')
  async mine(@CurrentUser() user: AuthenticatedUser) {
    const enrollments = await EnrollmentsService.listMyEnrollments(user.id);
    return ApiResponse.success({ message: 'Enrollments fetched.', data: enrollments });
  }

  @Get('me/:courseId')
  async myCourse(@CurrentUser() user: AuthenticatedUser, @Param('courseId') courseId: string) {
    const enrollment = await EnrollmentsService.getMyCourseEnrollment(user.id, courseId);
    return ApiResponse.success({ message: 'Enrollment fetched.', data: enrollment });
  }

  @Get('me/progress/:courseId')
  async myProgress(@CurrentUser() user: AuthenticatedUser, @Param('courseId') courseId: string) {
    const enrollment = await EnrollmentsService.getMyCourseEnrollment(user.id, courseId);
    if (!enrollment) throw new NotFoundError('Enrollment not found.');
    return ApiResponse.success({ message: 'Progress fetched.', data: enrollment });
  }

  @Post(':enrollmentId/progress')
  async progress(@CurrentUser() user: AuthenticatedUser, @Body() body: { lessonId: string }) {
    const result = await EnrollmentsService.markLessonComplete(user.id, body.lessonId);
    return ApiResponse.success({ message: 'Lesson progress updated.', data: result.enrollment });
  }
}

@ApiTags('Lessons')
@Controller('v1/lessons')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('BearerAuth')
export class LessonCompletionController {
  @Post(':id/complete')
  async complete(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    const result = await EnrollmentsService.markLessonComplete(user.id, id);
    return ApiResponse.success({ message: 'Lesson marked as complete.', data: result });
  }
}

@ApiTags('Student Progress')
@Controller('v1/students/me')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('BearerAuth')
export class StudentMeController {
  @Get('enrollments')
  async enrollments(@CurrentUser() user: AuthenticatedUser) {
    const enrollments = await EnrollmentsService.listMyEnrollments(user.id);
    return ApiResponse.success({ message: 'Enrollments fetched.', data: enrollments });
  }

  @Get('progress')
  async progress(@CurrentUser() user: AuthenticatedUser) {
    const enrollments = await EnrollmentsService.listMyEnrollments(user.id);
    return ApiResponse.success({ message: 'Progress fetched.', data: enrollments });
  }

  @Get('resume')
  async resume(@CurrentUser() user: AuthenticatedUser) {
    const enrollment = await EnrollmentsService.getMyResume(user.id);
    return ApiResponse.success({ message: 'Resume target fetched.', data: enrollment });
  }
}
