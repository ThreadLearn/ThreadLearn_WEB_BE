import { Controller, Post, Get, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { BookmarkService } from '../services/bookmark.service';
import { ToggleBookmarkDto } from '../dto/bookmark.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../../../common/decorators/current-user.decorator';

@ApiTags('bookmarks')
@Controller('bookmarks')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('STUDENT', 'ADMIN')
@ApiBearerAuth()
export class BookmarkController {
  constructor(private readonly bookmarkService: BookmarkService) {}

  @Post('toggle')
  async toggle(@CurrentUser() user: JwtPayload, @Body() dto: ToggleBookmarkDto) {
    const data = await this.bookmarkService.toggleBookmark(user.id, dto);
    return { message: 'Bookmark toggled.', data };
  }

  @Get('me')
  async getMyBookmarks(
    @CurrentUser() user: JwtPayload,
    @Query('page')       page       = '1',
    @Query('limit')      limit      = '10',
    @Query('targetType') targetType?: 'COURSE' | 'LESSON',
  ) {
    const result = await this.bookmarkService.getMyBookmarks(
      user.id,
      parseInt(page, 10),
      Math.min(parseInt(limit, 10), 50),
      targetType,
    );
    return {
      message: 'Bookmarks fetched.',
      data:    result.data,
      meta:    { total: result.total, page: result.page, limit: result.limit, hasMore: result.hasMore },
    };
  }

  @Get('check')
  async check(
    @CurrentUser() user: JwtPayload,
    @Query('targetType') targetType: 'COURSE' | 'LESSON',
    @Query('targetId')   targetId: string,
  ) {
    const bookmarked = await this.bookmarkService.isBookmarked(user.id, targetType, targetId);
    return { message: 'Bookmark status checked.', data: { bookmarked } };
  }
}
