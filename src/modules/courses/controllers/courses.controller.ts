import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ApiResponse } from '../../../common/api-response';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CoursesService } from '../services/courses.service';

@ApiTags('Courses')
@Controller('v1/courses')
export class CoursesController {
  @Get()
  async getCourses(
    @Query('page') page = '1',
    @Query('limit') limit = '10',
    @Query('search') search = ''
  ) {
    const result = await CoursesService.listCourses(
      parseInt(page, 10),
      parseInt(limit, 10),
      search
    );

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

  @Get(':id')
  async getCourseById(@Param('id') id: string) {
    const courseDetail = await CoursesService.getCourseDetail(id);
    return ApiResponse.success({
      message: 'Course details fetched successfully.',
      data: courseDetail,
    });
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN')
  @ApiBearerAuth('BearerAuth')
  async createCourse(@Body() body: unknown) {
    const course = await CoursesService.createCourse(body);
    return ApiResponse.success({
      message: 'Course created successfully.',
      data: course,
      statusCode: 201,
    });
  }
}

export default CoursesController;
