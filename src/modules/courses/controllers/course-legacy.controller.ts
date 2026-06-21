import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedUser } from '../../../common/api-handler';
import { ApiResponse } from '../../../common/api-response';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { EnrollmentsService } from '../../enrollments/services/enrollments.service';
import { CourseReviewsService } from '../services/course-reviews.service';

/**
 * Legacy course routes that are not part of the Phase 1 Course CRUD/search sample yet.
 * Core course list/detail/admin routes are owned by modules/course.
 */
@ApiTags('Courses')
@Controller('v1/courses')
export class CourseLegacyController {
  @Post(':id/enroll')
  @UseGuards(JwtAuthGuard)
  @Roles('STUDENT')
  @ApiBearerAuth('BearerAuth')
  async enroll(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    const enrollment = await EnrollmentsService.enrollInCourse(user.id, id);
    return ApiResponse.success({ message: 'Course enrolled.', data: enrollment, statusCode: 201 });
  }

  @Get(':id/reviews')
  async reviews(@Param('id') id: string, @Query('page') page = '1', @Query('limit') limit = '10') {
    const result = await CourseReviewsService.list(id, Number(page), Number(limit));
    return ApiResponse.success({
      message: 'Course reviews fetched.',
      data: result.reviews,
      meta: { page: result.page, limit: result.limit, total: result.total, totalPages: result.totalPages },
    });
  }

  @Post(':id/reviews')
  @UseGuards(JwtAuthGuard)
  @Roles('STUDENT')
  @ApiBearerAuth('BearerAuth')
  async review(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { rating: number; content?: string },
  ) {
    const review = await CourseReviewsService.createOrUpdate(user.id, id, body);
    return ApiResponse.success({ message: 'Course review saved.', data: review, statusCode: 201 });
  }
}
