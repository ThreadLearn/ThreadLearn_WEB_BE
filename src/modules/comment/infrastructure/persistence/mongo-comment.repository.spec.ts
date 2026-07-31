import { Comment } from '../../models/comment.model';
import { MongoCommentRepository } from './mongo-comment.repository';
import { CommentEntity } from '../../domain/entities/comment.entity';

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
      status: { $ne: 'hidden' },
    });
    expect(result.data).toEqual([
      expect.objectContaining({
        status: 'deleted',
        content: 'This comment has been deleted.',
        isAnonymous: true,
        isOwner: false,
      }),
    ]);
    expect(result.data[0]).not.toHaveProperty('userId');
    expect(result.data[0]).not.toHaveProperty('user');
    expect(result.data[0]).not.toHaveProperty('codeShareId');
    expect(result.total).toBe(1);
  });

  it('uses updatedAt and active status as an optimistic concurrency predicate', async () => {
    const updatedAt = new Date('2026-07-28T00:00:00.000Z');
    const entity = CommentEntity.fromPersistence({
      id: '507f1f77bcf86cd799439014',
      targetType: 'LESSON',
      targetId: '507f1f77bcf86cd799439012',
      userId: '507f1f77bcf86cd799439011',
      content: 'new content',
      parentId: null,
      isAnonymous: false,
      status: 'active',
      isEdited: true,
      updatedAt,
      mentionUserIds: [],
    });
    const findOneAndUpdate = jest.spyOn(Comment, 'findOneAndUpdate').mockResolvedValue(null);
    jest.spyOn(Comment, 'exists').mockResolvedValue({ _id: entity.id } as never);

    await expect(new MongoCommentRepository().update(entity)).rejects.toMatchObject({
      statusCode: 409,
      code: 'COMMENT_WRITE_CONFLICT',
    });
    expect(findOneAndUpdate).toHaveBeenCalledWith(
      {
        _id: entity.id,
        status: { $ne: 'deleted' },
        updatedAt,
      },
      expect.any(Object),
      expect.objectContaining({ new: true, runValidators: true }),
    );
  });
});
