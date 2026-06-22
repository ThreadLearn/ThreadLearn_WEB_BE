import { Inject, Injectable } from '@nestjs/common';
import { NotFoundError } from '../../../../common/custom-error';
import { BOOKMARK_REPOSITORY, IBookmarkRepository } from '../../domain/interfaces/bookmark.repository';

@Injectable()
export class UpdateBookmarkService {
  constructor(@Inject(BOOKMARK_REPOSITORY) private readonly bookmarks: IBookmarkRepository) {}

  async execute(userId: string, bookmarkId: string, data: any) {
    const bookmark = await this.bookmarks.findOwned(userId, bookmarkId);
    if (!bookmark) throw new NotFoundError('BOOKMARK_NOT_FOUND');
    bookmark.applyPatch(data);
    return this.bookmarks.update(bookmark);
  }
}
