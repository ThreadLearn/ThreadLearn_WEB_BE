import { VideoBookmark } from './models/video-bookmark.model';
import { VideoBookmarksService } from './video-bookmarks.service';

jest.mock('./models/video-bookmark.model', () => ({
  VideoBookmark: { find: jest.fn(), create: jest.fn(), findOneAndDelete: jest.fn() },
}));

describe('VideoBookmarksService', () => {
  const access = { assertLessonViewAccess: jest.fn() };
  const service = new VideoBookmarksService(access as any);
  const user = { id: 'user-1', role: 'STUDENT' } as const;

  beforeEach(() => jest.clearAllMocks());

  it('requires lesson viewing access before listing a learner video bookmarks', async () => {
    const bookmarks = [{ _id: 'bookmark-1', timestampSeconds: 45, note: 'Important point' }];
    (VideoBookmark.find as jest.Mock).mockReturnValue({
      sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(bookmarks) }),
    });

    await expect(service.listMine(user, 'lesson-1')).resolves.toEqual(bookmarks);
    expect(access.assertLessonViewAccess).toHaveBeenCalledWith('lesson-1', user);
  });

  it('stores a timestamp under the current learner and lesson', async () => {
    (VideoBookmark.create as jest.Mock).mockResolvedValue({ _id: 'bookmark-1' });

    await service.createMine(user, {
      lessonId: 'lesson-1',
      timestampSeconds: 75,
      note: 'Review locks',
    });

    expect(VideoBookmark.create).toHaveBeenCalledWith({
      userId: 'user-1',
      lessonId: 'lesson-1',
      timestampSeconds: 75,
      note: 'Review locks',
    });
  });
});
