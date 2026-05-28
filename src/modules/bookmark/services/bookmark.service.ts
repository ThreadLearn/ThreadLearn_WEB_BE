import { Bookmark } from '../models/bookmark.model';
import { BadRequestError } from '../../../common/custom-error';
import mongoose from 'mongoose';

interface ToggleBookmarkDto {
  targetType: 'COURSE' | 'LESSON';
  targetId: string;
  title: string;
  thumbnailUrl?: string;
}

export class BookmarkService {
  static async toggleBookmark(userId: string, dto: ToggleBookmarkDto) {
    const existing = await Bookmark.findOneAndDelete({
      userId,
      targetType: dto.targetType,
      targetId: dto.targetId,
    });

    if (existing) {
      return { bookmarked: false };
    }

    try {
      const bookmark = await Bookmark.create({
        userId,
        targetType: dto.targetType,
        targetId: dto.targetId,
        title: dto.title,
        thumbnailUrl: dto.thumbnailUrl,
      });
      return { bookmarked: true, bookmark };
    } catch (err: any) {
      // E11000: a concurrent request already created this bookmark — treat as success
      if (err.code === 11000) {
        return { bookmarked: true };
      }
      throw err;
    }
  }

  static async getMyBookmarks(
    userId: string,
    page = 1,
    limit = 10,
    targetType?: 'COURSE' | 'LESSON'
  ) {
    const skip = (page - 1) * limit;
    const query: any = { userId };
    if (targetType) {
      query.targetType = targetType;
    }

    const [bookmarks, total] = await Promise.all([
      Bookmark.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Bookmark.countDocuments(query),
    ]);

    return {
      data: bookmarks,
      total,
      page,
      limit,
      hasMore: skip + bookmarks.length < total,
    };
  }

  static async isBookmarked(
    userId: string,
    targetType: 'COURSE' | 'LESSON',
    targetId: string
  ): Promise<boolean> {
    if (!mongoose.isValidObjectId(targetId)) {
      throw new BadRequestError('Invalid targetId format.');
    }
    const exists = await Bookmark.exists({ userId, targetType, targetId });
    return !!exists;
  }
}

export default BookmarkService;
