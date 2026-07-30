import { VideoWatchProgress } from './models/video-watch-progress.model';
import { VideoWatchProgressService } from './video-watch-progress.service';

jest.mock('./models/video-watch-progress.model', () => ({
  VideoWatchProgress: { findOne: jest.fn(), findOneAndUpdate: jest.fn(), deleteOne: jest.fn() },
}));

describe('VideoWatchProgressService', () => {
  const access = { assertLessonViewAccess: jest.fn() };
  const service = new VideoWatchProgressService(access as any);
  const user = { id: '507f1f77bcf86cd799439011' };
  const lessonId = '507f1f77bcf86cd799439012';

  beforeEach(() => jest.clearAllMocks());

  it('requires lesson access before retrieving saved progress', async () => {
    (VideoWatchProgress.findOne as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue(null),
    });

    await service.getMine(user, lessonId);

    expect(access.assertLessonViewAccess).toHaveBeenCalledWith(lessonId, user);
  });

  it('upserts progress for the current learner and lesson', async () => {
    (VideoWatchProgress.findOneAndUpdate as jest.Mock).mockResolvedValue({ _id: 'progress-1' });

    await service.saveMine(user, { lessonId, currentTimeSeconds: 81, durationSeconds: 600 });

    expect(VideoWatchProgress.findOneAndUpdate).toHaveBeenCalledWith(
      { userId: user.id, lessonId },
      { $set: { currentTimeSeconds: 81, durationSeconds: 600 } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
  });
});
