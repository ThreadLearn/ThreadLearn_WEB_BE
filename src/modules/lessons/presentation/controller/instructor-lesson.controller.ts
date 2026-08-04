import {
  Body,
  Controller,
  Delete,
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
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { Roles } from '../../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { ZodValidationPipe } from '../../../../common/pipes/zod-validation.pipe';
import {
  CreateInstructorLessonDto,
  ReorderInstructorLessonsDto,
  UpdateInstructorLessonDto,
  createInstructorLessonSchema,
  reorderInstructorLessonsSchema,
  updateInstructorLessonSchema,
} from '../../application/dto/instructor-lesson.dto';
import { lessonIdParamSchema } from '../../application/dto/lesson.dto';
import { CreateInstructorLessonService } from '../../application/services/create-instructor-lesson.service';
import { GetInstructorLessonDetailService } from '../../application/services/get-instructor-lesson-detail.service';
import { ListInstructorLessonsBySectionService } from '../../application/services/list-instructor-lessons-by-section.service';
import { ReorderInstructorLessonsService } from '../../application/services/reorder-instructor-lessons.service';
import { SoftDeleteInstructorLessonService } from '../../application/services/soft-delete-instructor-lesson.service';
import { UpdateInstructorLessonService } from '../../application/services/update-instructor-lesson.service';
import { UploadInstructorLessonAttachmentService } from '../../application/services/upload-instructor-lesson-attachment.service';
import { LessonPresenter } from '../response/lesson.presenter';

@ApiTags('Instructor Lesson Authoring')
@Controller('v1/instructor')
@UseGuards(JwtAuthGuard)
@Roles('INSTRUCTOR')
@ApiBearerAuth('BearerAuth')
export class InstructorLessonController {
  constructor(
    private readonly listBySectionService: ListInstructorLessonsBySectionService,
    private readonly getDetailService: GetInstructorLessonDetailService,
    private readonly createService: CreateInstructorLessonService,
    private readonly updateService: UpdateInstructorLessonService,
    private readonly softDeleteService: SoftDeleteInstructorLessonService,
    private readonly reorderService: ReorderInstructorLessonsService,
    private readonly uploadAttachmentService: UploadInstructorLessonAttachmentService,
  ) {}

  @Get('sections/:sectionId/lessons')
  @ApiOperation({ summary: 'Instructor lists active lessons of an assigned section.' })
  async listBySection(
    @CurrentUser() user: AuthenticatedUser,
    @Param('sectionId', new ZodValidationPipe(lessonIdParamSchema)) sectionId: string,
  ) {
    const lessons = await this.listBySectionService.execute(
      { id: user.id, role: user.role },
      sectionId,
    );
    return ApiResponse.success({
      message: 'Lessons fetched successfully.',
      data: LessonPresenter.toList(lessons as any),
    });
  }

  @Post('sections/:sectionId/lessons')
  @ApiOperation({ summary: 'Instructor creates a new lesson in an assigned section.' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('sectionId', new ZodValidationPipe(lessonIdParamSchema)) sectionId: string,
    @Body(new ZodValidationPipe(createInstructorLessonSchema)) body: CreateInstructorLessonDto,
  ) {
    const lesson = await this.createService.execute(
      { id: user.id, role: user.role },
      sectionId,
      body,
    );
    return ApiResponse.success({
      message: 'Lesson created successfully.',
      data: LessonPresenter.toResponse(lesson as any),
      statusCode: 201,
    });
  }

  @Post('sections/:sectionId/lessons/reorder')
  @ApiOperation({ summary: 'Instructor reorders active lessons in an assigned section.' })
  async reorder(
    @CurrentUser() user: AuthenticatedUser,
    @Param('sectionId', new ZodValidationPipe(lessonIdParamSchema)) sectionId: string,
    @Body(new ZodValidationPipe(reorderInstructorLessonsSchema)) body: ReorderInstructorLessonsDto,
  ) {
    const result = await this.reorderService.execute(
      { id: user.id, role: user.role },
      sectionId,
      body.orderedLessonIds,
    );
    return ApiResponse.success({
      message: 'Lessons reordered successfully.',
      data: result,
    });
  }

  @Get('lessons/:id')
  @ApiOperation({ summary: 'Instructor fetches lesson detail for authoring.' })
  async getDetail(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ZodValidationPipe(lessonIdParamSchema)) id: string,
  ) {
    const result = await this.getDetailService.execute({ id: user.id, role: user.role }, id);
    return ApiResponse.success({
      message: 'Lesson detail fetched successfully.',
      data: LessonPresenter.toResponse(result.lesson as any),
    });
  }

  @Put('lessons/:id')
  @ApiOperation({ summary: 'Instructor updates an assigned lesson.' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ZodValidationPipe(lessonIdParamSchema)) id: string,
    @Body(new ZodValidationPipe(updateInstructorLessonSchema)) body: UpdateInstructorLessonDto,
  ) {
    const lesson = await this.updateService.execute({ id: user.id, role: user.role }, id, body);
    return ApiResponse.success({
      message: 'Lesson updated successfully.',
      data: LessonPresenter.toResponse(lesson as any),
    });
  }

  @Delete('lessons/:id')
  @ApiOperation({ summary: 'Instructor soft-deletes an assigned lesson.' })
  async softDelete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ZodValidationPipe(lessonIdParamSchema)) id: string,
  ) {
    const result = await this.softDeleteService.execute({ id: user.id, role: user.role }, id);
    return ApiResponse.success({
      message: 'Lesson deleted successfully.',
      data: result,
    });
  }

  @Post('lessons/:id/attachment')
  @UseInterceptors(FileInterceptor('attachment'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Instructor uploads an attachment for an assigned lesson.' })
  async uploadAttachment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ZodValidationPipe(lessonIdParamSchema)) id: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const lesson = await this.uploadAttachmentService.execute(
      { id: user.id, role: user.role },
      id,
      file,
    );
    return ApiResponse.success({
      message: 'Attachment uploaded successfully.',
      data: LessonPresenter.toResponse(lesson as any),
    });
  }
}
