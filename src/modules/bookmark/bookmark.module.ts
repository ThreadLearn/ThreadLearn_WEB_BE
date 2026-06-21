import { Module } from '@nestjs/common';
import { LearningAccessModule } from '../../shared/application/learning-access/learning-access.module';
import { BookmarkController, LessonBookmarksController } from './controllers/bookmark.controller';
import { BookmarkService } from './services/bookmark.service';

@Module({
  imports: [LearningAccessModule],
  controllers: [BookmarkController, LessonBookmarksController],
  providers: [BookmarkService],
})
export class BookmarkModule {}
