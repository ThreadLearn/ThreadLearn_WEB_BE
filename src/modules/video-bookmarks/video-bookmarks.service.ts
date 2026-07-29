import { Inject, Injectable } from '@nestjs/common';
import { NotFoundError } from '../../common/custom-error';
import {
  ILearningAccess,
  LEARNING_ACCESS,
  LearningAccessViewer,
} from '../../shared/domain/interfaces/learning-access.port';
import { CreateVideoBookmarkDto } from './video-bookmark.dto';
import { VideoBookmark } from './models/video-bookmark.model';

@Injectable()
export class VideoBookmarksService {
  constructor(@Inject(LEARNING_ACCESS) private readonly access: ILearningAccess) {}

  async listMine(user: LearningAccessViewer, lessonId: string) {
    await this.access.assertLessonViewAccess(lessonId, user);
    return VideoBookmark.find({ userId: user.id, lessonId }).sort({ createdAt: -1 }).lean();
  }

  async createMine(user: LearningAccessViewer, input: CreateVideoBookmarkDto) {
    await this.access.assertLessonViewAccess(input.lessonId, user);
    return VideoBookmark.create({
      userId: user.id,
      lessonId: input.lessonId,
      timestampSeconds: input.timestampSeconds,
      note: input.note || undefined,
    });
  }

  async removeMine(userId: string, bookmarkId: string) {
    const deleted = await VideoBookmark.findOneAndDelete({ _id: bookmarkId, userId });
    if (!deleted) throw new NotFoundError('Video bookmark not found.');
    return { deleted: true };
  }
}
