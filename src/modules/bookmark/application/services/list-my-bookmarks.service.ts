import { Inject, Injectable } from '@nestjs/common';
import { BookmarkTargetType } from '../../domain/entities/bookmark.entity';
import { BOOKMARK_REPOSITORY, IBookmarkRepository } from '../../domain/interfaces/bookmark.repository';

@Injectable()
export class ListMyBookmarksService {
  constructor(@Inject(BOOKMARK_REPOSITORY) private readonly bookmarks: IBookmarkRepository) {}

  async execute(userId: string, page = 1, limit = 10, targetType?: BookmarkTargetType) {
    return this.bookmarks.listByUser(userId, page, limit, targetType);
  }
}
