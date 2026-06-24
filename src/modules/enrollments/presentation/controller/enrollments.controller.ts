import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthenticatedUser } from '../../../../common/api-handler';
import { ApiResponse } from '../../../../common/api-response';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { ZodValidationPipe } from '../../../../common/pipes/zod-validation.pipe';
import { NotFoundError } from '../../../../common/custom-error';
import {
  EnrollCourseDto,
  LessonProgressDto,
  courseIdParamSchema,
  enrollCourseSchema,
  lessonIdParamSchema,
  lessonProgressSchema,
} from '../../application/dto/enrollment.dto';
import { CompleteLessonService } from '../../application/services/complete-lesson.service';
import { EnrollInCourseService } from '../../application/services/enroll-in-course.service';
import { GetMyCourseEnrollmentService } from '../../application/services/get-my-course-enrollment.service';
import { GetMyResumeService } from '../../application/services/get-my-resume.service';
import { ListMyEnrollmentsService } from '../../application/services/list-my-enrollments.service';
import { EnrollmentPresenter } from '../response/enrollment.presenter';

@ApiTags('Enrollments')
@Controller('v1/enrollments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('BearerAuth')
export class EnrollmentsController {
  constructor(
    private readonly enrollInCourse: EnrollInCourseService,
    private readonly listMine: ListMyEnrollmentsService,
    private readonly getMyCourse: GetMyCourseEnrollmentService,
    private readonly completeLesson: CompleteLessonService,
  ) {}

  @Post()
  async enroll(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(enrollCourseSchema)) body: EnrollCourseDto,
  ) {
    const enrollment = await this.enrollInCourse.execute(user.id, body.courseId);
    return ApiResponse.success({
      message: 'Course enrolled.',
      data: EnrollmentPresenter.toResponse(enrollment),
      statusCode: 201,
    });
  }

  @Get('me')
  async mine(@CurrentUser() user: AuthenticatedUser) {
    const enrollments = await this.listMine.execute(user.id);
    return ApiResponse.success({
      message: 'Enrollments fetched.',
      data: EnrollmentPresenter.toList(enrollments),
    });
  }

  @Get('me/:courseId')
  async myCourse(
    @CurrentUser() user: AuthenticatedUser,
    @Param('courseId', new ZodValidationPipe(courseIdParamSchema)) courseId: string,
  ) {
    const enrollment = await this.getMyCourse.execute(user.id, courseId);
    return ApiResponse.success({
      message: 'Enrollment fetched.',
      data: EnrollmentPresenter.toResponse(enrollment),
    });
  }

  @Get('me/progress/:courseId')
  async myProgress(
    @CurrentUser() user: AuthenticatedUser,
    @Param('courseId', new ZodValidationPipe(courseIdParamSchema)) courseId: string,
  ) {
    const enrollment = await this.getMyCourse.execute(user.id, courseId);
    if (!enrollment) throw new NotFoundError('Enrollment not found.');
    return ApiResponse.success({
      message: 'Progress fetched.',
      data: EnrollmentPresenter.toResponse(enrollment),
    });
  }

  @Post(':enrollmentId/progress')
  async progress(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(lessonProgressSchema)) body: LessonProgressDto,
  ) {
    const result = await this.completeLesson.execute(user.id, body.lessonId);
    return ApiResponse.success({
      message: 'Lesson progress updated.',
      data: EnrollmentPresenter.toResponse(result.enrollment),
    });
  }
}

@ApiTags('Lessons')
@Controller('v1/lessons')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('BearerAuth')
export class LessonCompletionController {
  constructor(private readonly completeLesson: CompleteLessonService) {}

  @Post(':id/complete')
  async complete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ZodValidationPipe(lessonIdParamSchema)) id: string,
  ) {
    const result = await this.completeLesson.execute(user.id, id);
    return ApiResponse.success({
      message: 'Lesson marked as complete.',
      data: { ...result, enrollment: EnrollmentPresenter.toResponse(result.enrollment) },
    });
  }
}

@ApiTags('Student Progress')
@Controller('v1/students/me')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('BearerAuth')
export class StudentMeController {
  constructor(
    private readonly listMine: ListMyEnrollmentsService,
    private readonly getResume: GetMyResumeService,
  ) {}

  @Get('enrollments')
  async enrollments(@CurrentUser() user: AuthenticatedUser) {
    const enrollments = await this.listMine.execute(user.id);
    return ApiResponse.success({
      message: 'Enrollments fetched.',
      data: EnrollmentPresenter.toList(enrollments),
    });
  }

  @Get('progress')
  async progress(@CurrentUser() user: AuthenticatedUser) {
    const enrollments = await this.listMine.execute(user.id);
    return ApiResponse.success({
      message: 'Progress fetched.',
      data: EnrollmentPresenter.toList(enrollments),
    });
  }

  @Get('resume')
  async resume(@CurrentUser() user: AuthenticatedUser) {
    const enrollment = await this.getResume.execute(user.id);
    return ApiResponse.success({
      message: 'Resume target fetched.',
      data: EnrollmentPresenter.toResponse(enrollment),
    });
  }
}
