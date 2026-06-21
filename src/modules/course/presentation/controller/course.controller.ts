import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedUser } from '../../../../common/api-handler';
import { ApiResponse } from '../../../../common/api-response';
import { BadRequestError } from '../../../../common/custom-error';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { Roles } from '../../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { ZodValidationPipe } from '../../../../common/pipes/zod-validation.pipe';
import { saveUploadedFile } from '../../../../configs/upload';
import {
  CreateCourseDto,
  ListCoursesQueryDto,
  SetVisibilityDto,
  UpdateCourseDto,
  courseIdParamSchema,
  createCourseSchema,
  listCoursesQuerySchema,
  setVisibilitySchema,
  updateCourseSchema,
} from '../../application/dto/course.dto';
import { CreateCourseService } from '../../application/services/create-course.service';
import { DeleteCourseService } from '../../application/services/delete-course.service';
import { GetCourseDetailService } from '../../application/services/get-course-detail.service';
import { ListCoursesService } from '../../application/services/list-courses.service';
import { RestoreCourseService } from '../../application/services/restore-course.service';
import { SetCourseVisibilityService } from '../../application/services/set-course-visibility.service';
import { UpdateCourseService } from '../../application/services/update-course.service';
import { CoursePresenter } from '../response/course.presenter';

/**
 * Controller MỎNG: chỉ parse input (DTO) → gọi đúng 1 application service → trả ApiResponse.
 * Không business logic, không truy cập DB trực tiếp. (Phần enroll/reviews tạm ở CoursesController
 * legacy vì là aggregate khác — sẽ chuyển ở Phase 3/5.)
 */
@ApiTags('Courses')
@Controller('v1/courses')
export class CourseController {
  constructor(
    private readonly listCourses: ListCoursesService,
    private readonly getDetail: GetCourseDetailService,
    private readonly createCourse: CreateCourseService,
    private readonly updateCourse: UpdateCourseService,
    private readonly setVisibility: SetCourseVisibilityService,
    private readonly deleteCourse: DeleteCourseService,
    private readonly restoreCourse: RestoreCourseService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'UC24 — list / search / filter courses.' })
  async list(
    @Query(new ZodValidationPipe(listCoursesQuerySchema)) query: ListCoursesQueryDto,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    const result = await this.listCourses.execute({
      ...query,
      includeAll: !!query.includeAll && user?.role === 'ADMIN',
    });
    return ApiResponse.success({
      message: 'Courses fetched successfully.',
      data: CoursePresenter.toList(result.items),
      meta: { page: result.page, limit: result.limit, total: result.total, totalPages: result.totalPages },
    });
  }

  @Get('search')
  @ApiOperation({ summary: 'UC24 — alias của list.' })
  async search(
    @Query(new ZodValidationPipe(listCoursesQuerySchema)) query: ListCoursesQueryDto,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.list(query, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'UC23 — course detail (course + sections + lessons).' })
  async detail(@Param('id') id: string, @CurrentUser() user?: AuthenticatedUser) {
    const result = await this.getDetail.execute(id, user);
    return ApiResponse.success({
      message: 'Course details fetched successfully.',
      data: {
        course: CoursePresenter.toResponse(result.course),
        sections: result.sections,
        lessons: result.lessons,
      },
    });
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN')
  @ApiBearerAuth('BearerAuth')
  @ApiOperation({ summary: 'UC15 — create course.' })
  async create(
    @Body(new ZodValidationPipe(createCourseSchema)) body: CreateCourseDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const course = await this.createCourse.execute({ ...body, createdBy: user?.id });
    return ApiResponse.success({
      message: 'Course created successfully.',
      data: CoursePresenter.toResponse(course),
      statusCode: 201,
    });
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN')
  @ApiBearerAuth('BearerAuth')
  @ApiOperation({ summary: 'UC16 — update course.' })
  async update(
    @Param('id', new ZodValidationPipe(courseIdParamSchema)) id: string,
    @Body(new ZodValidationPipe(updateCourseSchema)) body: UpdateCourseDto,
  ) {
    const course = await this.updateCourse.execute(id, body);
    return ApiResponse.success({ message: 'Course updated successfully.', data: CoursePresenter.toResponse(course) });
  }

  @Patch(':id/publish')
  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN')
  @ApiBearerAuth('BearerAuth')
  @ApiOperation({ summary: 'UC17 — publish / hide / draft.' })
  async publish(
    @Param('id', new ZodValidationPipe(courseIdParamSchema)) id: string,
    @Body(new ZodValidationPipe(setVisibilitySchema)) body: SetVisibilityDto,
  ) {
    const course = await this.setVisibility.execute(id, body.status);
    return ApiResponse.success({ message: `Course is now ${course.status}.`, data: CoursePresenter.toResponse(course) });
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN')
  @ApiBearerAuth('BearerAuth')
  @ApiOperation({ summary: 'UC18 — soft delete course.' })
  async remove(@Param('id', new ZodValidationPipe(courseIdParamSchema)) id: string) {
    const course = await this.deleteCourse.execute(id);
    return ApiResponse.success({ message: 'Course deleted.', data: CoursePresenter.toResponse(course) });
  }

  @Post(':id/restore')
  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN')
  @ApiBearerAuth('BearerAuth')
  @ApiOperation({ summary: 'Restore a soft-deleted course (within 30 days).' })
  async restore(@Param('id', new ZodValidationPipe(courseIdParamSchema)) id: string) {
    const course = await this.restoreCourse.execute(id);
    return ApiResponse.success({ message: 'Course restored.', data: CoursePresenter.toResponse(course) });
  }

  @Post(':id/thumbnail')
  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN')
  @UseInterceptors(FileInterceptor('thumbnail'))
  @ApiBearerAuth('BearerAuth')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload course thumbnail.' })
  async uploadThumbnail(
    @Param('id', new ZodValidationPipe(courseIdParamSchema)) id: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestError('No thumbnail file provided in FormData.');
    if (!/^image\/(png|jpe?g|webp|gif)$/i.test(file.mimetype)) {
      throw new BadRequestError(`Unsupported image type: ${file.mimetype}.`);
    }
    const url = await saveUploadedFile(file, 'thumbnails');
    const course = await this.updateCourse.execute(id, { thumbnailUrl: url });
    return ApiResponse.success({
      message: 'Thumbnail uploaded.',
      data: { thumbnailUrl: url, course: CoursePresenter.toResponse(course) },
    });
  }
}
