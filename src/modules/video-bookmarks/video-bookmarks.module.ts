import { Module } from '@nestjs/common';
import { LearningAccessModule } from '../../shared/application/learning-access/learning-access.module';
import { VideoBookmarksController } from './video-bookmarks.controller';
import { VideoBookmarksService } from './video-bookmarks.service';

@Module({
  imports: [LearningAccessModule],
  controllers: [VideoBookmarksController],
  providers: [VideoBookmarksService],
})
export class VideoBookmarksModule {}
