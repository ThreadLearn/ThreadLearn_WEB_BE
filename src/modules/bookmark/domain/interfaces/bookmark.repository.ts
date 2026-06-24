import { BookmarkEntity, BookmarkTargetType } from '../entities/bookmark.entity';

export interface BookmarkListResult {
  data: unknown[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

export interface IBookmarkRepository {
  toggle(bookmark: BookmarkEntity): Promise<{ bookmarked: boolean; bookmark?: unknown }>;
  listByUser(userId: string, page: number, limit: number, targetType?: BookmarkTargetType): Promise<BookmarkListResult>;
  exists(userId: string, targetType: BookmarkTargetType, targetId: string): Promise<boolean>;
  findOwned(userId: string, bookmarkId: string): Promise<BookmarkEntity | null>;
  update(bookmark: BookmarkEntity): Promise<unknown>;
}

export const BOOKMARK_REPOSITORY = Symbol('BOOKMARK_REPOSITORY');
