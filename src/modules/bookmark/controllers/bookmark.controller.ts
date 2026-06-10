import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiResponse } from '../../../common/api-response';
import { BadRequestError } from '../../../common/custom-error';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import type { AuthenticatedUser } from '../../../common/api-handler';
import { BookmarkService } from '../services/bookmark.service';
import {
  toggleBookmarkSchema,
  myBookmarksQuerySchema,
  checkBookmarkQuerySchema,
} from '../validators/bookmark.validator';

@ApiTags('Bookmarks')
@Controller('v1/bookmarks')
@UseGuards(JwtAuthGuard) @ApiBearerAuth('BearerAuth')
export class BookmarkController {
  @Post()
  @ApiOperation({ summary: 'Compatibility alias for UC34 bookmark toggle.' })
  async toggleAlias(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: {
      lessonId?: string;
      targetType?: 'COURSE' | 'LESSON';
      targetId?: string;
      title?: string;
      thumbnailUrl?: string;
      anchorText?: string;
      position?: number;
      note?: string;
      folder?: string;
      tags?: string[];
    },
  ) {
    if (!user) throw new BadRequestError('User context required.');
    const targetType = body.targetType ?? 'LESSON';
    const targetId = body.targetId ?? body.lessonId;
    if (!targetId) throw new BadRequestError('targetId is required.');
    const data = await BookmarkService.toggleBookmark(user.id, {
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
    @Param('lessonId') lessonId: string,
    @Body() body: { title?: string; anchorText?: string; position?: number; note?: string; folder?: string; tags?: string[] },
  ) {
    return this.toggleAlias(user, { ...body, targetType: 'LESSON', targetId: lessonId });
  }

  @Post('toggle')
  @ApiOperation({ summary: 'UC34 — toggle save/unsave bookmark.' })
  async toggle(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(toggleBookmarkSchema))
    body: { targetType: 'COURSE' | 'LESSON'; targetId: string; title: string; thumbnailUrl?: string },
  ) {
    if (!user) throw new BadRequestError('User context required.');
    const data = await BookmarkService.toggleBookmark(user.id, body);
    return ApiResponse.success({ message: 'Bookmark toggled.', data });
  }

  @Get('me')
  @ApiOperation({ summary: 'UC33 — my bookmarks (filter by targetType).' })
  async listMine(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(myBookmarksQuerySchema))
    query: { page: number; limit: number; targetType?: 'COURSE' | 'LESSON' },
  ) {
    if (!user) throw new BadRequestError('User context required.');
    const result = await BookmarkService.listMyBookmarks(user.id, query.page, query.limit, query.targetType);
    return ApiResponse.success({
      message: 'Bookmarks fetched.',
      data:    result.data,
      meta: {
        page: result.page, limit: result.limit, total: result.total,
        totalPages: result.totalPages, hasMore: result.hasMore,
      },
    });
  }

  @Get()
  @ApiOperation({ summary: 'Compatibility alias for my bookmarks.' })
  async listMineAlias(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(myBookmarksQuerySchema))
    query: { page: number; limit: number; targetType?: 'COURSE' | 'LESSON' },
  ) {
    return this.listMine(user, query);
  }

  @Get('check')
  @ApiOperation({ summary: 'Check whether the current user bookmarked a target.' })
  async check(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(checkBookmarkQuerySchema))
    query: { targetType: 'COURSE' | 'LESSON'; targetId: string },
  ) {
    if (!user) throw new BadRequestError('User context required.');
    const bookmarked = await BookmarkService.isBookmarked(user.id, query.targetType, query.targetId);
    return ApiResponse.success({ message: 'Check complete.', data: { bookmarked } });
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: { title?: string; thumbnailUrl?: string; anchorText?: string; position?: number; note?: string; folder?: string; tags?: string[] },
  ) {
    if (!user) throw new BadRequestError('User context required.');
    const bookmark = await BookmarkService.updateBookmark(user.id, id, body);
    return ApiResponse.success({ message: 'Bookmark updated.', data: bookmark });
  }

  @Delete(':id')
  async remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    if (!user) throw new BadRequestError('User context required.');
    const result = await BookmarkService.removeBookmark(user.id, id);
    return ApiResponse.success({ message: 'Bookmark deleted.', data: result });
  }
}
