import { Module } from '@nestjs/common';
import { LearningAccessModule } from '../../shared/application/learning-access/learning-access.module';
import { IsBookmarkedService } from './application/services/is-bookmarked.service';
import { ListMyBookmarksService } from './application/services/list-my-bookmarks.service';
import { RemoveBookmarkService } from './application/services/remove-bookmark.service';
import { ToggleBookmarkService } from './application/services/toggle-bookmark.service';
import { UpdateBookmarkService } from './application/services/update-bookmark.service';
import { BOOKMARK_REPOSITORY } from './domain/interfaces/bookmark.repository';
import { MongoBookmarkRepository } from './infrastructure/persistence/mongo-bookmark.repository';
import { BookmarkController, LessonBookmarksController } from './presentation/controller/bookmark.controller';

@Module({
  imports: [LearningAccessModule],
  controllers: [BookmarkController, LessonBookmarksController],
  providers: [
    MongoBookmarkRepository,
    { provide: BOOKMARK_REPOSITORY, useExisting: MongoBookmarkRepository },
    ToggleBookmarkService,
    ListMyBookmarksService,
    IsBookmarkedService,
    UpdateBookmarkService,
    RemoveBookmarkService,
  ],
})
export class BookmarkModule {}
