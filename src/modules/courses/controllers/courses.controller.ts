import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CoursesService } from '../services/courses.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../../../common/decorators/current-user.decorator';

@ApiTags('courses')
@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Get()
  async getCourses(
    @Query('page') page = '1',
    @Query('limit') limit = '10',
    @Query('search') search = '',
  ) {
    const result = await this.coursesService.listCourses(
      parseInt(page, 10), parseInt(limit, 10), search,
    );
    return { message: 'Courses fetched.', data: result.courses,
             meta: { page: result.page, limit: result.limit, total: result.total, totalPages: result.totalPages } };
  }

  @Get(':id')
  async getCourseById(@Param('id') id: string) {
    const data = await this.coursesService.getCourseDetail(id);
    return { message: 'Course fetched.', data };
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  async createCourse(@Body() body: any) {
    const data = await this.coursesService.createCourse(body);
    return { message: 'Course created.', data, statusCode: 201 };
  }
}
