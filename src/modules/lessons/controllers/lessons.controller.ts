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
import jwt from 'jsonwebtoken';
import { ApiResponse } from '../../../common/api-response';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { BadRequestError } from '../../../common/custom-error';
import { env } from '../../../configs/env';
import { saveUploadedFile } from '../../../configs/upload';
import { EnrollmentsService } from '../../enrollments/services/enrollments.service';
import { BookmarkService } from '../../bookmark/services/bookmark.service';
import { CommentService } from '../../comment/services/comment.service';
import { NotesService } from '../../notes/services/notes.service';
import { LessonsService } from '../services/lessons.service';
import type { AuthenticatedUser } from '../../../common/api-handler';

interface RequestWithUser {
  user?: AuthenticatedUser;
  headers?: Record<string, string | undefined>;
}

const getOptionalUser = (req: RequestWithUser): AuthenticatedUser | undefined => {
  if (req.user) return req.user;
  const authHeader = req.headers?.authorization;
  if (!authHeader?.startsWith('Bearer ')) return undefined;
  try {
    return jwt.verify(authHeader.split(' ')[1], env.JWT_ACCESS_SECRET) as AuthenticatedUser;
  } catch {
    return undefined;
  }
};

@ApiTags('Lessons')
@Controller('v1/lessons')
export class LessonsController {
  @Get()
  async listLessons(@Query('courseId') courseId: string) {
    const lessons = await LessonsService.listByCourse(courseId);
    return ApiResponse.success({ message: 'Lessons fetched.', data: lessons });
  }

  @Get('by-course/:courseId')
  async byCourse(@Param('courseId') courseId: string) {
    const lessons = await LessonsService.listByCourse(courseId);
    return ApiResponse.success({ message: 'Lessons fetched.', data: lessons });
  }

  @Get(':id')
  async getLessonById(@Param('id') id: string, @Req() req: RequestWithUser) {
    const lesson = await LessonsService.getLessonForViewer(id, getOptionalUser(req));
    return ApiResponse.success({
      message: 'Lesson content retrieved successfully.',
      data: lesson,
    });
  }

  @Get(':id/access-check')
  async accessCheck(@Param('id') id: string, @Req() req: RequestWithUser) {
    const result = await LessonsService.checkAccess(id, getOptionalUser(req));
    return ApiResponse.success({ message: 'Access checked.', data: result });
  }

  @Get(':id/comments')
  async lessonComments(@Param('id') id: string, @Query('page') page = '1', @Query('limit') limit = '10') {
    const result = await CommentService.listComments('LESSON', id, Number(page), Number(limit));
    return ApiResponse.success({
      message: 'Comments fetched.',
      data: result.data,
      meta: { page: result.page, limit: result.limit, total: result.total, totalPages: result.totalPages },
    });
  }

  @Post(':id/comments')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('BearerAuth')
  async createLessonComment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: { content: string; parentId?: string }
  ) {
    const comment = await CommentService.createComment(user.id, user.role, {
      targetType: 'LESSON',
      targetId: id,
      content: body.content,
      parentId: body.parentId,
    });
    return ApiResponse.success({ message: 'Comment created.', data: comment, statusCode: 201 });
  }

  @Post(':id/bookmarks')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('BearerAuth')
  async createLessonBookmark(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: { title?: string; anchorText?: string; position?: number; note?: string; folder?: string; tags?: string[] }
  ) {
    const bookmark = await BookmarkService.toggleBookmark(user.id, {
      targetType: 'LESSON',
      targetId: id,
      title: body.title ?? 'Lesson bookmark',
      anchorText: body.anchorText,
      position: body.position,
      note: body.note,
      folder: body.folder,
      tags: body.tags,
    });
    return ApiResponse.success({ message: 'Bookmark toggled.', data: bookmark });
  }

  @Get(':id/notes/me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('BearerAuth')
  async myLessonNotes(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    const notes = await NotesService.listByLesson(user.id, id);
    return ApiResponse.success({ message: 'Notes fetched.', data: notes });
  }

  @Post(':id/notes')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('BearerAuth')
  async upsertLessonNote(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: { noteText?: string; content?: string; codeSnippet?: string }
  ) {
    const note = await NotesService.upsert(user.id, {
      lessonId: id,
      noteText: body.noteText ?? body.content ?? '',
      codeSnippet: body.codeSnippet,
    });
    return ApiResponse.success({ message: 'Note saved.', data: note });
  }

  @Get(':id/versions')
  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN')
  @ApiBearerAuth('BearerAuth')
  async listVersions(@Param('id') id: string) {
    const versions = await LessonsService.listVersions(id);
    return ApiResponse.success({ message: 'Versions fetched.', data: versions });
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN')
  @ApiBearerAuth('BearerAuth')
  async create(@Body() body: any, @Req() req: RequestWithUser) {
    const lesson = await LessonsService.createLesson({ ...body, createdBy: req.user?.id });
    return ApiResponse.success({ message: 'Lesson created.', data: lesson, statusCode: 201 });
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN')
  @ApiBearerAuth('BearerAuth')
  async update(@Param('id') id: string, @Body() body: any, @Req() req: RequestWithUser) {
    const lesson = await LessonsService.updateLesson(id, body, { id: req.user?.id });
    return ApiResponse.success({ message: 'Lesson updated.', data: lesson });
  }

  @Patch(':id/lock')
  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN')
  @ApiBearerAuth('BearerAuth')
  async lock(@Param('id') id: string, @Body() body: { locked?: boolean }) {
    const lesson = await LessonsService.setLock(id, body?.locked ?? true);
    return ApiResponse.success({
      message: lesson.isLocked ? 'Lesson locked.' : 'Lesson unlocked.',
      data: lesson,
    });
  }

  @Post(':id/complete')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('BearerAuth')
  async complete(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    const result = await EnrollmentsService.markLessonComplete(user.id, id);
    return ApiResponse.success({ message: 'Lesson marked as complete.', data: result });
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN')
  @ApiBearerAuth('BearerAuth')
  async remove(@Param('id') id: string) {
    const result = await LessonsService.softDelete(id);
    return ApiResponse.success({ message: 'Lesson deleted.', data: result });
  }

  @Post(':id/attachment')
  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN')
  @UseInterceptors(FileInterceptor('attachment'))
  @ApiBearerAuth('BearerAuth')
  @ApiConsumes('multipart/form-data')
  async uploadAttachment(@Param('id') id: string, @UploadedFile() file?: Express.Multer.File) {
    try {
      if (!file) throw new BadRequestError('No attachment file provided in FormData.');
      const fileUrl = await saveUploadedFile(file, 'attachments');
      const updatedLesson = await LessonsService.updateAttachment(id, fileUrl);
      return ApiResponse.success({
        message: 'Attachment uploaded successfully.',
        data: updatedLesson,
      });
    } catch (err: any) {
      if (err instanceof BadRequestError) throw err;
      if (err instanceof BadRequestException) throw err;
      throw new BadRequestError('Failed to parse multipart/form-data for lesson attachment upload.');
    }
  }
}

export default LessonsController;
