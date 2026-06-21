import { Inject, Injectable } from '@nestjs/common';
import mongoose from 'mongoose';
import { Bookmark, BookmarkTargetType } from '../models/bookmark.model';
import { BadRequestError, NotFoundError } from '../../../common/custom-error';
import {
  ILearningAccess,
  LEARNING_ACCESS,
  LearningAccessViewer,
} from '../../../shared/domain/interfaces/learning-access.port';

interface ToggleInput {
  targetType:    BookmarkTargetType;
  targetId:      string;
  title:         string;
  thumbnailUrl?: string;
  anchorText?: string;
  position?: number;
  note?: string;
  folder?: string;
  tags?: string[];
}

type LessonViewAccess = (lessonId: string, viewer: LearningAccessViewer) => Promise<unknown>;

@Injectable()
export class BookmarkService {
  constructor(@Inject(LEARNING_ACCESS) private readonly learningAccess: ILearningAccess) {}

  async toggleBookmark(userId: string, dto: ToggleInput) {
    return BookmarkService.toggleBookmark(userId, dto, this.learningAccess);
  }

  async listMyBookmarks(
    userId: string,
    page = 1,
    limit = 10,
    targetType?: BookmarkTargetType,
  ) {
    return BookmarkService.listMyBookmarks(userId, page, limit, targetType);
  }

  async isBookmarked(userId: string, targetType: BookmarkTargetType, targetId: string): Promise<boolean> {
    return BookmarkService.isBookmarked(userId, targetType, targetId);
  }

  async updateBookmark(
    userId: string,
    bookmarkId: string,
    data: Partial<Pick<ToggleInput, 'title' | 'thumbnailUrl' | 'anchorText' | 'position' | 'note' | 'folder' | 'tags'>>,
  ) {
    return BookmarkService.updateBookmark(userId, bookmarkId, data);
  }

  async removeBookmark(userId: string, bookmarkId: string) {
    return BookmarkService.removeBookmark(userId, bookmarkId);
  }

  /** UC34 — toggle bookmark: nếu đã có → xóa, chưa có → tạo. */
  static async toggleBookmark(
    userId: string,
    dto: ToggleInput,
    accessPort: Pick<ILearningAccess, 'assertLessonViewAccess'>,
  ) {
    if (!mongoose.isValidObjectId(dto.targetId)) {
      throw new BadRequestError('Invalid targetId format.');
    }
    if (dto.targetType === 'LESSON') {
      await accessPort.assertLessonViewAccess(dto.targetId, { id: userId, role: 'STUDENT' });
    }
    const existing = await Bookmark.findOneAndDelete({
      userId,
      targetType: dto.targetType,
      targetId:   dto.targetId,
    });
    if (existing) return { bookmarked: false };

    try {
      const bookmark = await Bookmark.create({
        userId,
        targetType:   dto.targetType,
        targetId:     dto.targetId,
        title:        dto.title,
        thumbnailUrl: dto.thumbnailUrl,
        anchorText: dto.anchorText,
        position: dto.position,
        note: dto.note,
        folder: dto.folder,
        tags: dto.tags ?? [],
        status: 'active',
      });
      return { bookmarked: true, bookmark };
    } catch (err: any) {
      // Race: another request beat us — treat as already bookmarked.
      if (err?.code === 11000) return { bookmarked: true };
      throw err;
    }
  }

  /** UC33 — list bookmarks of the signed-in user. */
  private static async toggleBookmarkWithAccess(
    userId: string,
    dto: ToggleInput,
    assertLessonViewAccess: LessonViewAccess,
  ) {
    if (!mongoose.isValidObjectId(dto.targetId)) {
      throw new BadRequestError('Invalid targetId format.');
    }
    if (dto.targetType === 'LESSON') {
      await assertLessonViewAccess(dto.targetId, { id: userId, role: 'STUDENT' });
    }
    const existing = await Bookmark.findOneAndDelete({
      userId,
      targetType: dto.targetType,
      targetId: dto.targetId,
    });
    if (existing) return { bookmarked: false };

    try {
      const bookmark = await Bookmark.create({
        userId,
        targetType: dto.targetType,
        targetId: dto.targetId,
        title: dto.title,
        thumbnailUrl: dto.thumbnailUrl,
        anchorText: dto.anchorText,
        position: dto.position,
        note: dto.note,
        folder: dto.folder,
        tags: dto.tags ?? [],
        status: 'active',
      });
      return { bookmarked: true, bookmark };
    } catch (err: any) {
      if (err?.code === 11000) return { bookmarked: true };
      throw err;
    }
  }

  static async listMyBookmarks(
    userId: string,
    page = 1,
    limit = 10,
    targetType?: BookmarkTargetType,
  ) {
    const skip   = (page - 1) * limit;
    const query: any = { userId, status: { $ne: 'deleted' } };
    if (targetType) query.targetType = targetType;

    const [items, total] = await Promise.all([
      Bookmark.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Bookmark.countDocuments(query),
    ]);
    return {
      data:    items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasMore: skip + items.length < total,
    };
  }

  /** Check helper for FE icon state. */
  static async isBookmarked(
    userId: string,
    targetType: BookmarkTargetType,
    targetId: string,
  ): Promise<boolean> {
    if (!mongoose.isValidObjectId(targetId)) return false;
    return !!(await Bookmark.exists({ userId, targetType, targetId }));
  }

  static async updateBookmark(
    userId: string,
    bookmarkId: string,
    data: Partial<Pick<ToggleInput, 'title' | 'thumbnailUrl' | 'anchorText' | 'position' | 'note' | 'folder' | 'tags'>>
  ) {
    if (!mongoose.isValidObjectId(bookmarkId)) throw new BadRequestError('Invalid bookmark id.');
    const bookmark = await Bookmark.findOne({ _id: bookmarkId, userId, status: { $ne: 'deleted' } });
    if (!bookmark) throw new NotFoundError('BOOKMARK_NOT_FOUND');

    for (const key of ['title', 'thumbnailUrl', 'anchorText', 'position', 'note', 'folder', 'tags'] as const) {
      if (data[key] !== undefined) (bookmark as any)[key] = data[key];
    }
    await bookmark.save();
    return bookmark;
  }

  static async removeBookmark(userId: string, bookmarkId: string) {
    if (!mongoose.isValidObjectId(bookmarkId)) throw new BadRequestError('Invalid bookmark id.');
    const bookmark = await Bookmark.findOne({ _id: bookmarkId, userId, status: { $ne: 'deleted' } });
    if (!bookmark) throw new NotFoundError('BOOKMARK_NOT_FOUND');
    bookmark.status = 'deleted';
    await bookmark.save();
    return { deleted: true };
  }
}
export default BookmarkService;
