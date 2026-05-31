import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import mongoose from 'mongoose';
import { IBookmark } from '../models/bookmark.model';
import { BadRequestError } from '../../../common/custom-error';

interface ToggleBookmarkDto {
  targetType: 'COURSE' | 'LESSON';
  targetId: string;
  title: string;
  thumbnailUrl?: string;
}

@Injectable()
export class BookmarkService {
  constructor(
    @InjectModel('Bookmark') private bookmarkModel: Model<IBookmark>,
  ) {}

  async toggleBookmark(userId: string, dto: ToggleBookmarkDto) {
    const existing = await this.bookmarkModel.findOneAndDelete({
      userId,
      targetType: dto.targetType,
      targetId:   dto.targetId,
    });

    if (existing) return { bookmarked: false };

    try {
      const bookmark = await this.bookmarkModel.create({
        userId,
        targetType:   dto.targetType,
        targetId:     dto.targetId,
        title:        dto.title,
        thumbnailUrl: dto.thumbnailUrl,
      });
      return { bookmarked: true, bookmark };
    } catch (err: any) {
      // E11000: concurrent request already created — treat as already bookmarked
      if (err.code === 11000) return { bookmarked: true };
      throw err;
    }
  }

  async getMyBookmarks(
    userId: string,
    page = 1,
    limit = 10,
    targetType?: 'COURSE' | 'LESSON',
  ) {
    const skip  = (page - 1) * limit;
    const query: any = { userId };
    if (targetType) query.targetType = targetType;

    const [bookmarks, total] = await Promise.all([
      this.bookmarkModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      this.bookmarkModel.countDocuments(query),
    ]);

    return { data: bookmarks, total, page, limit, hasMore: skip + bookmarks.length < total };
  }

  async isBookmarked(
    userId: string,
    targetType: 'COURSE' | 'LESSON',
    targetId: string,
  ): Promise<boolean> {
    if (!mongoose.isValidObjectId(targetId)) {
      throw new BadRequestError('Invalid targetId format.');
    }
    return !!(await this.bookmarkModel.exists({ userId, targetType, targetId }));
  }
}
