import { Module } from '@nestjs/common';
import { LearningAccessModule } from '../../shared/application/learning-access/learning-access.module';
import { VideoWatchProgressController } from './video-watch-progress.controller';
import { VideoWatchProgressService } from './video-watch-progress.service';

@Module({
  imports: [LearningAccessModule],
  controllers: [VideoWatchProgressController],
  providers: [VideoWatchProgressService],
})
export class VideoWatchProgressModule {}
