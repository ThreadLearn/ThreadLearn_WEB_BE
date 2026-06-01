import {
  Controller, Get, Post, Put, Patch, Delete,
  Body, Param, Query, UseGuards, Req,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CoursesService } from '../services/courses.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../../../common/guards/optional-jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../../../common/decorators/current-user.decorator';
import {
  CreateCourseDto, UpdateCourseDto, TogglePublishDto, SearchCourseDto,
} from '../dto/course.dto';

@ApiTags('courses')
@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  // ─── Public ─────────────────────────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'UC23 — list published courses (Guest/Student/Admin).' })
  async list(@Query() q: SearchCourseDto) {
    const result = await this.coursesService.searchCourses(q);
    return {
      message: 'Courses fetched.',
      data:    result.data,
      meta:    {
        page: result.page, limit: result.limit, total: result.total,
        totalPages: result.totalPages, hasMore: result.hasMore,
      },
    };
  }

  @Get('search')
  @ApiOperation({ summary: 'UC24 — search/filter with text index (vector-ready).' })
  async search(@Query() q: SearchCourseDto) {
    return this.list(q);
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'UC23 — course detail (includes lessons + enrollment state).' })
  async detail(
    @Param('id') id: string,
    @Req() req: { user?: JwtPayload },
  ) {
    const data = await this.coursesService.getCourseDetail(id, {
      viewerUserId: req.user?.id,
      viewerRole:   req.user?.role as 'STUDENT' | 'ADMIN' | undefined,
    });
    return { message: 'Course fetched.', data };
  }

  // ─── Admin ──────────────────────────────────────────────────────────────────

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard) @Roles('ADMIN') @ApiBearerAuth()
  @ApiOperation({ summary: 'UC15 — create course (Admin).' })
  async create(@Body() dto: CreateCourseDto, @CurrentUser() user: JwtPayload) {
    const data = await this.coursesService.createCourse(dto, user.id);
    return { message: 'Course created.', data, statusCode: 201 };
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard) @Roles('ADMIN') @ApiBearerAuth()
  @ApiOperation({ summary: 'UC16 — update course (Admin).' })
  async update(@Param('id') id: string, @Body() dto: UpdateCourseDto) {
    const data = await this.coursesService.updateCourse(id, dto);
    return { message: 'Course updated.', data };
  }

  @Patch(':id/publish')
  @UseGuards(JwtAuthGuard, RolesGuard) @Roles('ADMIN') @ApiBearerAuth()
  @ApiOperation({ summary: 'UC17 — hide/show course (Admin).' })
  async togglePublish(@Param('id') id: string, @Body() dto: TogglePublishDto) {
    const data = await this.coursesService.togglePublish(id, dto.isPublished);
    return { message: dto.isPublished ? 'Course published.' : 'Course hidden.', data };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard) @Roles('ADMIN') @ApiBearerAuth()
  @ApiOperation({ summary: 'UC18 — soft delete course (Admin).' })
  async remove(@Param('id') id: string) {
    await this.coursesService.deleteCourse(id);
    return { message: 'Course deleted.' };
  }
}
