import { Inject, Injectable } from '@nestjs/common';
import { BookmarkTargetType } from '../../domain/entities/bookmark.entity';
import { BOOKMARK_REPOSITORY, IBookmarkRepository } from '../../domain/interfaces/bookmark.repository';

@Injectable()
export class IsBookmarkedService {
  constructor(@Inject(BOOKMARK_REPOSITORY) private readonly bookmarks: IBookmarkRepository) {}

  async execute(userId: string, targetType: BookmarkTargetType, targetId: string): Promise<boolean> {
    return this.bookmarks.exists(userId, targetType, targetId);
  }
}
