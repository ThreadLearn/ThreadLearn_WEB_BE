import { Inject, Injectable } from '@nestjs/common';
import {
  ILearningAccess,
  LEARNING_ACCESS,
  LearningAccessViewer,
} from '../../shared/domain/interfaces/learning-access.port';
import { SaveVideoWatchProgressDto } from './video-watch-progress.dto';
import { VideoWatchProgress } from './models/video-watch-progress.model';

@Injectable()
export class VideoWatchProgressService {
  constructor(@Inject(LEARNING_ACCESS) private readonly access: ILearningAccess) {}

  async getMine(user: LearningAccessViewer, lessonId: string) {
    await this.access.assertLessonViewAccess(lessonId, user);
    return VideoWatchProgress.findOne({ userId: user.id, lessonId }).lean();
  }

  async saveMine(user: LearningAccessViewer, input: SaveVideoWatchProgressDto) {
    await this.access.assertLessonViewAccess(input.lessonId, user);
    return VideoWatchProgress.findOneAndUpdate(
      { userId: user.id, lessonId: input.lessonId },
      {
        $set: {
          currentTimeSeconds: input.currentTimeSeconds,
          durationSeconds: input.durationSeconds,
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
  }

  async resetMine(user: LearningAccessViewer, lessonId: string) {
    await this.access.assertLessonViewAccess(lessonId, user);
    await VideoWatchProgress.deleteOne({ userId: user.id, lessonId });
    return { deleted: true };
  }
}
