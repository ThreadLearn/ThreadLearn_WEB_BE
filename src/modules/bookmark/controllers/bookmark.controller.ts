import { AuthenticatedNextRequest } from '../../../common/api-handler';
import { ApiResponse } from '../../../common/api-response';
import { BookmarkService } from '../services/bookmark.service';
import { BadRequestError } from '../../../common/custom-error';

export class BookmarkController {
  static async toggle(req: AuthenticatedNextRequest) {
    const { id: userId } = req.user!;
    const body = await req.json();

    const result = await BookmarkService.toggleBookmark(userId, {
      targetType: body.targetType,
      targetId: body.targetId,
      title: body.title,
      thumbnailUrl: body.thumbnailUrl,
    });

    return ApiResponse.success({
      message: result.bookmarked ? 'Bookmark saved.' : 'Bookmark removed.',
      data: result,
    });
  }

  static async getMyBookmarks(req: AuthenticatedNextRequest) {
    const { id: userId } = req.user!;
    const { searchParams } = req.nextUrl;

    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '10', 10), 50);
    const rawType = searchParams.get('targetType');
    const targetType =
      rawType === 'COURSE' || rawType === 'LESSON' ? rawType : undefined;

    const result = await BookmarkService.getMyBookmarks(userId, page, limit, targetType);

    return ApiResponse.success({
      message: 'Bookmarks fetched successfully.',
      data: result.data,
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        hasMore: result.hasMore,
      },
    });
  }

  static async check(req: AuthenticatedNextRequest) {
    const { id: userId } = req.user!;
    const { searchParams } = req.nextUrl;

    const rawType = searchParams.get('targetType');
    const targetId = searchParams.get('targetId') || '';

    if (rawType !== 'COURSE' && rawType !== 'LESSON') {
      throw new BadRequestError('targetType must be COURSE or LESSON.');
    }
    if (!targetId) {
      throw new BadRequestError('targetId is required.');
    }

    const bookmarked = await BookmarkService.isBookmarked(userId, rawType, targetId);

    return ApiResponse.success({
      message: 'Bookmark status checked.',
      data: { bookmarked },
    });
  }
}

export default BookmarkController;
