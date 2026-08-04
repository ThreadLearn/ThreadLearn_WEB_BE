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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedUser } from '../../../../common/api-handler';
import { ApiResponse } from '../../../../common/api-response';
import { BadRequestError } from '../../../../common/custom-error';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { Roles } from '../../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../../../../common/guards/optional-jwt-auth.guard';
import { ZodValidationPipe } from '../../../../common/pipes/zod-validation.pipe';
import { saveUploadedFile } from '../../../../configs/upload';
import {
  CreateLessonDto,
  SetLockDto,
  UpdateLessonDto,
  createLessonSchema,
  lessonIdParamSchema,
  setLockSchema,
  updateLessonSchema,
} from '../../application/dto/lesson.dto';
import { CheckLessonAccessService } from '../../application/services/check-lesson-access.service';
import { CreateLessonService } from '../../application/services/create-lesson.service';
import { GetLessonForViewerService } from '../../application/services/get-lesson-for-viewer.service';
import { ListLessonsByCourseService } from '../../application/services/list-lessons-by-course.service';
import { ListLessonVersionsService } from '../../application/services/list-lesson-versions.service';
import { SetLessonLockService } from '../../application/services/set-lesson-lock.service';
import { SoftDeleteLessonService } from '../../application/services/soft-delete-lesson.service';
import { UpdateLessonAttachmentService } from '../../application/services/update-lesson-attachment.service';
import { UpdateLessonService } from '../../application/services/update-lesson.service';
import { InstructorResourceAccessService } from '../../../course/application/services/instructor-resource-access.service';
import { LessonPresenter } from '../response/lesson.presenter';
import { LessonVersionPresenter } from '../response/lesson-version.presenter';

/** Controller MỎNG — chỉ các route Lesson sở hữu. (Nested comment/bookmark/note ở bridge controller.) */
@ApiTags('Lessons')
@Controller('v1/lessons')
export class LessonController {
  constructor(
    private readonly listLessons: ListLessonsByCourseService,
    private readonly getForViewer: GetLessonForViewerService,
    private readonly checkAccess: CheckLessonAccessService,
    private readonly listVersionsSvc: ListLessonVersionsService,
    private readonly createLessonSvc: CreateLessonService,
    private readonly updateLessonSvc: UpdateLessonService,
    private readonly setLockSvc: SetLessonLockService,
    private readonly softDeleteSvc: SoftDeleteLessonService,
    private readonly updateAttachmentSvc: UpdateLessonAttachmentService,
    private readonly resourceAccess: InstructorResourceAccessService,
  ) {}

  @Get()
  async list(@Query('courseId') courseId: string) {
    const lessons = await this.listLessons.execute(courseId);
    return ApiResponse.success({ message: 'Lessons fetched.', data: LessonPresenter.toList(lessons) });
  }

  @Get('by-course/:courseId')
  async byCourse(@Param('courseId') courseId: string) {
    const lessons = await this.listLessons.execute(courseId);
    return ApiResponse.success({ message: 'Lessons fetched.', data: LessonPresenter.toList(lessons) });
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth('BearerAuth')
  async getById(
    @Param('id', new ZodValidationPipe(lessonIdParamSchema)) id: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    const lesson = await this.getForViewer.execute(id, user);
    return ApiResponse.success({
      message: 'Lesson content retrieved successfully.',
      data: LessonPresenter.toResponse(lesson),
    });
  }

  @Get(':id/access-check')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth('BearerAuth')
  async accessCheck(
    @Param('id', new ZodValidationPipe(lessonIdParamSchema)) id: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    const result = await this.checkAccess.execute(id, user);
    return ApiResponse.success({ message: 'Access checked.', data: result });
  }

  @Get(':id/versions')
  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN')
  @ApiBearerAuth('BearerAuth')
  async listVersions(@Param('id', new ZodValidationPipe(lessonIdParamSchema)) id: string) {
    const versions = await this.listVersionsSvc.execute(id);
    return ApiResponse.success({
      message: 'Versions fetched.',
      data: LessonVersionPresenter.toList(versions),
    });
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN')
  @ApiBearerAuth('BearerAuth')
  async create(
    @Body(new ZodValidationPipe(createLessonSchema)) body: CreateLessonDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const lesson = await this.createLessonSvc.execute({ ...body, createdBy: user?.id });
    return ApiResponse.success({
      message: 'Lesson created.',
      data: LessonPresenter.toResponse(lesson),
      statusCode: 201,
    });
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN')
  @ApiBearerAuth('BearerAuth')
  async update(
    @Param('id', new ZodValidationPipe(lessonIdParamSchema)) id: string,
    @Body(new ZodValidationPipe(updateLessonSchema)) body: UpdateLessonDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const lesson = await this.updateLessonSvc.execute(id, body, { id: user?.id });
    return ApiResponse.success({ message: 'Lesson updated.', data: LessonPresenter.toResponse(lesson) });
  }

  @Patch(':id/lock')
  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN')
  @ApiBearerAuth('BearerAuth')
  async lock(
    @Param('id', new ZodValidationPipe(lessonIdParamSchema)) id: string,
    @Body(new ZodValidationPipe(setLockSchema)) body: SetLockDto,
  ) {
    const lesson = await this.setLockSvc.execute(id, body?.locked ?? true);
    return ApiResponse.success({
      message: lesson.isLocked ? 'Lesson locked.' : 'Lesson unlocked.',
      data: LessonPresenter.toResponse(lesson),
    });
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN')
  @ApiBearerAuth('BearerAuth')
  async remove(@Param('id', new ZodValidationPipe(lessonIdParamSchema)) id: string) {
    const result = await this.softDeleteSvc.execute(id);
    return ApiResponse.success({ message: 'Lesson deleted.', data: result });
  }

  @Post(':id/attachment')
  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN')
  @UseInterceptors(FileInterceptor('attachment'))
  @ApiBearerAuth('BearerAuth')
  @ApiConsumes('multipart/form-data')
  async uploadAttachment(
    @Param('id', new ZodValidationPipe(lessonIdParamSchema)) id: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    try {
      if (!file) throw new BadRequestError('No attachment file provided in FormData.');
      const fileUrl = await saveUploadedFile(file, 'attachments');
      const lesson = await this.updateAttachmentSvc.execute(id, fileUrl);
      return ApiResponse.success({
        message: 'Attachment uploaded successfully.',
        data: LessonPresenter.toResponse(lesson),
      });
    } catch (err: any) {
      if (err instanceof BadRequestError) throw err;
      if (err instanceof BadRequestException) throw err;
      throw new BadRequestError('Failed to parse multipart/form-data for lesson attachment upload.');
    }
  }
}
