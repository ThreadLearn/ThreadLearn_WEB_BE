import { Injectable } from '@nestjs/common';
import mongoose from 'mongoose';
import { BadRequestError, NotFoundError } from '../../../../common/custom-error';
import { BookmarkEntity, BookmarkTargetType } from '../../domain/entities/bookmark.entity';
import { BookmarkListResult, IBookmarkRepository } from '../../domain/interfaces/bookmark.repository';
import { Bookmark } from '../../models/bookmark.model';
import { BookmarkMapper } from '../mapper/bookmark.mapper';

@Injectable()
export class MongoBookmarkRepository implements IBookmarkRepository {
  async toggle(bookmark: BookmarkEntity): Promise<{ bookmarked: boolean; bookmark?: unknown }> {
    const props = bookmark.toProps();
    const existing = await Bookmark.findOneAndDelete({
      userId: props.userId,
      targetType: props.targetType,
      targetId: props.targetId,
    });
    if (existing) return { bookmarked: false };
    try {
      const doc = await Bookmark.create(BookmarkMapper.toPersistence(bookmark));
      return { bookmarked: true, bookmark: doc };
    } catch (err: any) {
      if (err?.code === 11000) return { bookmarked: true };
      throw err;
    }
  }

  async listByUser(userId: string, page: number, limit: number, targetType?: BookmarkTargetType): Promise<BookmarkListResult> {
    const skip = (page - 1) * limit;
    const query: any = { userId, status: { $ne: 'deleted' } };
    if (targetType) query.targetType = targetType;
    const [items, total] = await Promise.all([
      Bookmark.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Bookmark.countDocuments(query),
    ]);
    return { data: items, total, page, limit, totalPages: Math.ceil(total / limit), hasMore: skip + items.length < total };
  }

  async exists(userId: string, targetType: BookmarkTargetType, targetId: string): Promise<boolean> {
    if (!mongoose.isValidObjectId(targetId)) return false;
    return !!(await Bookmark.exists({ userId, targetType, targetId }));
  }

  async findOwned(userId: string, bookmarkId: string): Promise<BookmarkEntity | null> {
    if (!mongoose.isValidObjectId(bookmarkId)) throw new BadRequestError('Invalid bookmark id.');
    const doc = await Bookmark.findOne({ _id: bookmarkId, userId, status: { $ne: 'deleted' } });
    return doc ? BookmarkMapper.toEntity(doc) : null;
  }

  async update(bookmark: BookmarkEntity): Promise<unknown> {
    const doc = await Bookmark.findByIdAndUpdate(bookmark.id, BookmarkMapper.toPersistence(bookmark), { new: true });
    if (!doc) throw new NotFoundError('BOOKMARK_NOT_FOUND');
    return doc;
  }
}
