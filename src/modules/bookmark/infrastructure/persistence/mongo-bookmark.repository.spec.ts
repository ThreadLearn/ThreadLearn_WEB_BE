import { BookmarkEntity } from '../../domain/entities/bookmark.entity';
import { Bookmark } from '../../models/bookmark.model';
import { MongoBookmarkRepository } from './mongo-bookmark.repository';

describe('MongoBookmarkRepository toggle', () => {
  afterEach(() => jest.restoreAllMocks());

  const entity = BookmarkEntity.createNew({
    userId: '507f1f77bcf86cd799439011',
    targetType: 'LESSON',
    targetId: '507f1f77bcf86cd799439012',
    title: 'Atomic bookmark',
  });

  it('performs the state flip in one atomic update pipeline', async () => {
    const update = jest.spyOn(Bookmark, 'findOneAndUpdate').mockResolvedValue({
      status: 'active',
      _id: '507f1f77bcf86cd799439013',
    } as never);

    const result = await new MongoBookmarkRepository().toggle(entity);

    expect(result.bookmarked).toBe(true);
    expect(update).toHaveBeenCalledTimes(1);
    expect(update.mock.calls[0][1]).toEqual(expect.arrayContaining([
      expect.objectContaining({
        $set: expect.objectContaining({
          status: expect.objectContaining({ $cond: expect.any(Array) }),
        }),
      }),
    ]));
    expect(update.mock.calls[0][2]).toEqual(expect.objectContaining({ upsert: true, new: true }));
  });

  it('retries a first-insert unique race without upsert so the second toggle is preserved', async () => {
    const duplicate = Object.assign(new Error('duplicate'), { code: 11000 });
    const update = jest.spyOn(Bookmark, 'findOneAndUpdate')
      .mockRejectedValueOnce(duplicate)
      .mockResolvedValueOnce({ status: 'deleted' } as never);

    const result = await new MongoBookmarkRepository().toggle(entity);

    expect(result.bookmarked).toBe(false);
    expect(update).toHaveBeenCalledTimes(2);
    expect(update.mock.calls[1][2]).toEqual(expect.objectContaining({ upsert: false, new: true }));
  });
});
