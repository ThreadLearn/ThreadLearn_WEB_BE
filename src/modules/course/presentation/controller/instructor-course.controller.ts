import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
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
  CreateInstructorCourseDto,
  UpdateInstructorCourseDto,
  courseIdParamSchema,
  createInstructorCourseSchema,
  updateInstructorCourseSchema,
} from '../../application/dto/course.dto';
import { CreateInstructorCourseService } from '../../application/services/create-instructor-course.service';
import { GetInstructorCourseDetailService } from '../../application/services/get-instructor-course-detail.service';
import { UpdateInstructorCourseService } from '../../application/services/update-instructor-course.service';
import { CoursePresenter } from '../response/course.presenter';

@ApiTags('Instructor Course Authoring')
@Controller('v1/instructor/courses')
@UseGuards(JwtAuthGuard)
@Roles('INSTRUCTOR')
@ApiBearerAuth('BearerAuth')
export class InstructorCourseController {
  constructor(
    private readonly createService: CreateInstructorCourseService,
    private readonly updateService: UpdateInstructorCourseService,
    private readonly getDetailService: GetInstructorCourseDetailService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Instructor creates a new draft course.' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createInstructorCourseSchema)) body: CreateInstructorCourseDto,
  ) {
    const course = await this.createService.execute({ id: user.id, role: user.role }, body);
    return ApiResponse.success({
      message: 'Course created successfully.',
      data: CoursePresenter.toResponse(course),
      statusCode: 201,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Instructor fetches course detail for authoring.' })
  async detail(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ZodValidationPipe(courseIdParamSchema)) id: string,
  ) {
    const result = await this.getDetailService.execute({ id: user.id, role: user.role }, id);
    return ApiResponse.success({
      message: 'Course details fetched successfully.',
      data: {
        course: CoursePresenter.toResponse(result.course),
        sections: result.sections,
        lessons: result.lessons,
      },
    });
  }

  @Put(':id')
  @ApiOperation({ summary: 'Instructor updates assigned course content.' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ZodValidationPipe(courseIdParamSchema)) id: string,
    @Body(new ZodValidationPipe(updateInstructorCourseSchema)) body: UpdateInstructorCourseDto,
  ) {
    const course = await this.updateService.execute({ id: user.id, role: user.role }, id, body);
    return ApiResponse.success({
      message: 'Course updated successfully.',
      data: CoursePresenter.toResponse(course),
    });
  }

  @Post(':id/thumbnail')
  @UseInterceptors(FileInterceptor('thumbnail'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Instructor uploads course thumbnail.' })
  async uploadThumbnail(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ZodValidationPipe(courseIdParamSchema)) id: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestError('No thumbnail file provided in FormData.');
    if (!/^image\/(png|jpe?g|webp|gif)$/i.test(file.mimetype)) {
      throw new BadRequestError(`Unsupported image type: ${file.mimetype}.`);
    }
    if (file.size > 2 * 1024 * 1024) {
      throw new BadRequestError('Thumbnail must not exceed 2 MB.');
    }

    // 1. Authorize course authoring FIRST before writing file to disk
    await this.updateService.execute({ id: user.id, role: user.role }, id, {});

    // 2. Save uploaded file to disk after authorization check passes
    const url = await saveUploadedFile(file, 'thumbnails');

    // 3. Update database with saved thumbnail URL
    const course = await this.updateService.execute({ id: user.id, role: user.role }, id, { thumbnailUrl: url });

    return ApiResponse.success({
      message: 'Thumbnail uploaded.',
      data: { thumbnailUrl: url, course: CoursePresenter.toResponse(course) },
    });
  }
}
