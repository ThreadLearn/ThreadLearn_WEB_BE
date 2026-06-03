import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { ApiResponse } from '../../../common/api-response';
import { BadRequestError } from '../../../common/custom-error';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { saveUploadedFile } from '../../../configs/upload';
import { CoursesService, CourseListQuery } from '../services/courses.service';
import { EnrollmentsService } from '../../enrollments/services/enrollments.service';
import { CourseReviewsService } from '../services/course-reviews.service';
import type { AuthenticatedUser } from '../../../common/api-handler';

interface RequestWithUser {
  user?: AuthenticatedUser;
}

@ApiTags('Courses')
@Controller('v1/courses')
export class CoursesController {
  @Get()
  async getCourses(@Query() rawQuery: Record<string, string>, @Req() req: RequestWithUser) {
    const role = req.user?.role;
    const query: CourseListQuery = {
      page: rawQuery.page ? Number(rawQuery.page) : undefined,
      limit: rawQuery.limit ? Number(rawQuery.limit) : undefined,
      q: rawQuery.q || rawQuery.search,
      search: rawQuery.search,
      level: rawQuery.level as any,
      language: rawQuery.language as any,
      tag: rawQuery.tag,
      category: rawQuery.category,
      isPremium:
        rawQuery.isPremium === 'true'
          ? true
          : rawQuery.isPremium === 'false'
          ? false
          : undefined,
      minPrice: rawQuery.minPrice ? Number(rawQuery.minPrice) : undefined,
      maxPrice: rawQuery.maxPrice ? Number(rawQuery.maxPrice) : undefined,
      status: rawQuery.status as any,
      includeAll: rawQuery.includeAll === 'true' && role === 'ADMIN',
    };
    const result = await CoursesService.listCourses(query);
    return ApiResponse.success({
      message: 'Courses fetched successfully.',
      data: result.courses,
      meta: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    });
  }

  @Get('search')
  async searchCourses(@Query() rawQuery: Record<string, string>, @Req() req: RequestWithUser) {
    return this.getCourses(rawQuery, req);
  }

  @Get(':id')
  async getCourseById(@Param('id') id: string, @Req() req: RequestWithUser) {
    const detail = await CoursesService.getCourseDetail(id, req.user);
    return ApiResponse.success({
      message: 'Course details fetched successfully.',
      data: detail,
    });
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN')
  @ApiBearerAuth('BearerAuth')
  async createCourse(@Body() body: any, @Req() req: RequestWithUser) {
    const course = await CoursesService.createCourse({ ...body, createdBy: req.user?.id });
    return ApiResponse.success({
      message: 'Course created successfully.',
      data: course,
      statusCode: 201,
    });
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN')
  @ApiBearerAuth('BearerAuth')
  async updateCourse(@Param('id') id: string, @Body() body: any) {
    const course = await CoursesService.updateCourse(id, body);
    return ApiResponse.success({ message: 'Course updated successfully.', data: course });
  }

  @Patch(':id/publish')
  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN')
  @ApiBearerAuth('BearerAuth')
  async publishCourse(@Param('id') id: string, @Body() body: { status?: 'published' | 'hidden' | 'draft' }) {
    const course = await CoursesService.setVisibility(id, body?.status ?? 'published');
    return ApiResponse.success({ message: `Course is now ${course.status}.`, data: course });
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN')
  @ApiBearerAuth('BearerAuth')
  async deleteCourse(@Param('id') id: string) {
    const course = await CoursesService.softDeleteCourse(id);
    return ApiResponse.success({ message: 'Course deleted.', data: course });
  }

  @Post(':id/restore')
  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN')
  @ApiBearerAuth('BearerAuth')
  async restoreCourse(@Param('id') id: string) {
    const course = await CoursesService.restoreCourse(id);
    return ApiResponse.success({ message: 'Course restored.', data: course });
  }

  @Post(':id/enroll')
  @UseGuards(JwtAuthGuard)
  @Roles('STUDENT')
  @ApiBearerAuth('BearerAuth')
  async enroll(@Param('id') id: string, @Req() req: RequestWithUser) {
    const enrollment = await EnrollmentsService.enrollInCourse(req.user!.id, id);
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

  @Post(':id/thumbnail')
  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN')
  @UseInterceptors(FileInterceptor('thumbnail'))
  @ApiBearerAuth('BearerAuth')
  @ApiConsumes('multipart/form-data')
  async uploadThumbnail(@Param('id') id: string, @UploadedFile() file?: Express.Multer.File) {
    try {
      if (!file) throw new BadRequestError('No thumbnail file provided in FormData.');
      // Whitelist common image types so we don't accidentally accept executables.
      if (!/^image\/(png|jpe?g|webp|gif)$/i.test(file.mimetype)) {
        throw new BadRequestError(`Unsupported image type: ${file.mimetype}.`);
      }
      const url = await saveUploadedFile(file, 'thumbnails');
      const course = await CoursesService.updateCourse(id, { thumbnailUrl: url });
      return ApiResponse.success({
        message: 'Thumbnail uploaded.',
        data: { thumbnailUrl: url, course },
      });
    } catch (err) {
      if (err instanceof BadRequestError) throw err;
      if (err instanceof BadRequestException) throw err;
      throw new BadRequestError('Failed to parse multipart/form-data for course thumbnail.');
    }
  }

  @Post(':id/reviews')
  @UseGuards(JwtAuthGuard)
  @Roles('STUDENT')
  @ApiBearerAuth('BearerAuth')
  async review(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
    @Body() body: { rating: number; content?: string }
  ) {
    const review = await CourseReviewsService.createOrUpdate(req.user!.id, id, body);
    return ApiResponse.success({ message: 'Course review saved.', data: review, statusCode: 201 });
  }
}

export default CoursesController;
