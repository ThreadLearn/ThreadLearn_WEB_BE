import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedUser } from '../../../../common/api-handler';
import { ApiResponse } from '../../../../common/api-response';
import { BadRequestError } from '../../../../common/custom-error';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { ZodValidationPipe } from '../../../../common/pipes/zod-validation.pipe';
import {
  CheckBookmarkQueryDto,
  MyBookmarksQueryDto,
  ToggleBookmarkDto,
  BookmarkCompatibilityDto,
  UpdateBookmarkDto,
  bookmarkCompatibilitySchema,
  bookmarkIdParamSchema,
  bookmarkMetadataSchema,
  checkBookmarkQuerySchema,
  myBookmarksQuerySchema,
  toggleBookmarkSchema,
  updateBookmarkSchema,
} from '../../application/dto/bookmark.dto';
import { IsBookmarkedService } from '../../application/services/is-bookmarked.service';
import { ListMyBookmarksService } from '../../application/services/list-my-bookmarks.service';
import { RemoveBookmarkService } from '../../application/services/remove-bookmark.service';
import { ToggleBookmarkService } from '../../application/services/toggle-bookmark.service';
import { UpdateBookmarkService } from '../../application/services/update-bookmark.service';

@ApiTags('Bookmarks')
@Controller('v1/bookmarks')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('BearerAuth')
export class BookmarkController {
  constructor(
    private readonly toggleBookmarkSvc: ToggleBookmarkService,
    private readonly listMyBookmarksSvc: ListMyBookmarksService,
    private readonly isBookmarkedSvc: IsBookmarkedService,
    private readonly updateBookmarkSvc: UpdateBookmarkService,
    private readonly removeBookmarkSvc: RemoveBookmarkService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Compatibility alias for UC34 bookmark toggle.' })
  async toggleAlias(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(bookmarkCompatibilitySchema)) body: BookmarkCompatibilityDto,
  ) {
    if (!user) throw new BadRequestError('User context required.');
    const targetType = body.targetType ?? 'LESSON';
    const targetId = body.targetId ?? body.lessonId;
    if (!targetId) throw new BadRequestError('targetId is required.');
    const data = await this.toggleBookmarkSvc.execute(user.id, {
      targetType,
      targetId,
      title: body.title ?? 'Untitled',
      thumbnailUrl: body.thumbnailUrl,
      anchorText: body.anchorText,
      position: body.position,
      note: body.note,
      folder: body.folder,
      tags: body.tags,
    });
    return ApiResponse.success({ message: 'Bookmark toggled.', data });
  }

  @Post('/lesson/:lessonId')
  @ApiOperation({ summary: 'Compatibility alias: save lesson bookmark.' })
  async bookmarkLessonAlias(
    @CurrentUser() user: AuthenticatedUser,
    @Param('lessonId', new ZodValidationPipe(bookmarkIdParamSchema)) lessonId: string,
    @Body(new ZodValidationPipe(bookmarkMetadataSchema)) body: UpdateBookmarkDto,
  ) {
    return this.toggleAlias(user, { ...body, targetType: 'LESSON', targetId: lessonId });
  }

  @Post('toggle')
  @ApiOperation({ summary: 'UC34 - toggle save/unsave bookmark.' })
  async toggle(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(toggleBookmarkSchema)) body: ToggleBookmarkDto,
  ) {
    if (!user) throw new BadRequestError('User context required.');
    const data = await this.toggleBookmarkSvc.execute(user.id, body);
    return ApiResponse.success({ message: 'Bookmark toggled.', data });
  }

  @Get('me')
  @ApiOperation({ summary: 'UC33 - my bookmarks (filter by targetType).' })
  async listMine(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(myBookmarksQuerySchema)) query: MyBookmarksQueryDto,
  ) {
    if (!user) throw new BadRequestError('User context required.');
    const result = await this.listMyBookmarksSvc.execute(user.id, query.page, query.limit, query.targetType);
    return ApiResponse.success({
      message: 'Bookmarks fetched.',
      data: result.data,
      meta: { page: result.page, limit: result.limit, total: result.total, totalPages: result.totalPages, hasMore: result.hasMore },
    });
  }

  @Get()
  @ApiOperation({ summary: 'Compatibility alias for my bookmarks.' })
  async listMineAlias(@CurrentUser() user: AuthenticatedUser, @Query(new ZodValidationPipe(myBookmarksQuerySchema)) query: MyBookmarksQueryDto) {
    return this.listMine(user, query);
  }

  @Get('check')
  @ApiOperation({ summary: 'Check whether the current user bookmarked a target.' })
  async check(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(checkBookmarkQuerySchema)) query: CheckBookmarkQueryDto,
  ) {
    if (!user) throw new BadRequestError('User context required.');
    const bookmarked = await this.isBookmarkedSvc.execute(user.id, query.targetType, query.targetId);
    return ApiResponse.success({ message: 'Check complete.', data: { bookmarked } });
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ZodValidationPipe(bookmarkIdParamSchema)) id: string,
    @Body(new ZodValidationPipe(updateBookmarkSchema)) body: UpdateBookmarkDto,
  ) {
    if (!user) throw new BadRequestError('User context required.');
    const bookmark = await this.updateBookmarkSvc.execute(user.id, id, body);
    return ApiResponse.success({ message: 'Bookmark updated.', data: bookmark });
  }

  @Delete(':id')
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ZodValidationPipe(bookmarkIdParamSchema)) id: string,
  ) {
    if (!user) throw new BadRequestError('User context required.');
    const result = await this.removeBookmarkSvc.execute(user.id, id);
    return ApiResponse.success({ message: 'Bookmark deleted.', data: result });
  }
}

@ApiTags('Lessons')
@Controller('v1/lessons')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('BearerAuth')
export class LessonBookmarksController {
  constructor(private readonly toggleBookmarkSvc: ToggleBookmarkService) {}

  @Post(':id/bookmarks')
  async createLessonBookmark(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ZodValidationPipe(bookmarkIdParamSchema)) id: string,
    @Body(new ZodValidationPipe(bookmarkMetadataSchema)) body: UpdateBookmarkDto,
  ) {
    const bookmark = await this.toggleBookmarkSvc.execute(user.id, {
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
}
