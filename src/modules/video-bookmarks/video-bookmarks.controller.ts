import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthenticatedUser } from '../../common/api-handler';
import { ApiResponse } from '../../common/api-response';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  CreateVideoBookmarkDto,
  createVideoBookmarkSchema,
  LessonIdQueryDto,
  lessonIdQuerySchema,
  videoBookmarkIdSchema,
} from './video-bookmark.dto';
import { VideoBookmarksService } from './video-bookmarks.service';

@ApiTags('Video bookmarks')
@Controller('v1/video-bookmarks')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('BearerAuth')
export class VideoBookmarksController {
  constructor(private readonly bookmarks: VideoBookmarksService) {}

  @Get()
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(lessonIdQuerySchema)) query: LessonIdQueryDto
  ) {
    return ApiResponse.success({
      message: 'Video bookmarks fetched.',
      data: await this.bookmarks.listMine(user, query.lessonId),
    });
  }

  @Post()
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createVideoBookmarkSchema)) body: CreateVideoBookmarkDto
  ) {
    return ApiResponse.success({
      message: 'Video bookmark created.',
      data: await this.bookmarks.createMine(user, body),
      statusCode: 201,
    });
  }

  @Delete(':id')
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ZodValidationPipe(videoBookmarkIdSchema)) id: string
  ) {
    return ApiResponse.success({
      message: 'Video bookmark removed.',
      data: await this.bookmarks.removeMine(user.id, id),
    });
  }
}
