import { Comment } from '../../models/comment.model';
import { MongoCommentRepository } from './mongo-comment.repository';

describe('MongoCommentRepository', () => {
  afterEach(() => jest.restoreAllMocks());

  it('keeps deleted top-level comments in the lesson thread as tombstones', async () => {
    const documents = [
      {
        _id: '507f1f77bcf86cd799439014',
        targetType: 'LESSON',
        targetId: '507f1f77bcf86cd799439012',
        userId: '507f1f77bcf86cd799439011',
        parentId: null,
        content: '[deleted]',
        status: 'deleted',
      },
    ];
    const chain = {
      populate: jest.fn(),
      sort: jest.fn(),
      skip: jest.fn(),
      limit: jest.fn(),
      lean: jest.fn().mockResolvedValue(documents),
    };
    chain.populate.mockReturnValue(chain);
    chain.sort.mockReturnValue(chain);
    chain.skip.mockReturnValue(chain);
    chain.limit.mockReturnValue(chain);
    const find = jest.spyOn(Comment, 'find').mockReturnValue(chain as any);
    jest.spyOn(Comment, 'countDocuments').mockResolvedValue(1 as never);

    const result = await new MongoCommentRepository().listByTarget(
      'LESSON',
      '507f1f77bcf86cd799439012',
      1,
      20,
    );

    expect(find).toHaveBeenCalledWith({
      targetType: 'LESSON',
      targetId: '507f1f77bcf86cd799439012',
      parentId: null,
    });
    expect(result.data).toEqual([
      expect.objectContaining({
        status: 'deleted',
        content: 'This comment has been deleted.',
        userId: '',
        user: undefined,
      }),
    ]);
    expect(result.total).toBe(1);
  });
});
