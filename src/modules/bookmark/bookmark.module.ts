import { Module } from '@nestjs/common';
import { LearningAccessModule } from '../../shared/application/learning-access/learning-access.module';
import { BookmarkController } from './controllers/bookmark.controller';
import { BookmarkService } from './services/bookmark.service';

@Module({
  imports: [LearningAccessModule],
  controllers: [BookmarkController],
  providers: [BookmarkService],
})
export class BookmarkModule {}
