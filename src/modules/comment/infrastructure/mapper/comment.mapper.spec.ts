import { CommentMapper } from './comment.mapper';

describe('CommentMapper public view privacy', () => {
  const base = {
    _id: '64b000000000000000000001',
    targetType: 'LESSON',
    targetId: '64b000000000000000000002',
    lessonId: '64b000000000000000000002',
    courseId: '64b000000000000000000003',
    userId: {
      _id: '64b000000000000000000004',
      firstName: 'Private',
      lastName: 'Author',
      avatarUrl: 'https://example.test/private.png',
    },
    parentId: null,
    content: 'Help me',
    status: 'active',
    isAnonymous: false,
    postType: 'CODE_HELP',
    questionStatus: 'OPEN',
    reactionCount: 0,
    helpfulCount: 0,
    replyCount: 0,
    mentionUserIds: [],
    codeShareId: '64b000000000000000000005',
    learningContext: { tried: 'private debugging notes' },
    instructorVerifiedBy: '64b000000000000000000006',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  it('does not disclose identity fields for an anonymous comment', () => {
    const view = CommentMapper.formatView({ ...base, isAnonymous: true });

    expect(view).not.toHaveProperty('userId');
    expect(view).not.toHaveProperty('user');
    expect(view).not.toHaveProperty('instructorVerifiedBy');
    expect(JSON.stringify(view)).not.toContain('64b000000000000000000004');
    expect(view).toMatchObject({ isAnonymous: true, authorLabel: 'Anonymous learner' });
  });

  it('returns an allowlisted tombstone without code, author, or learning details', () => {
    const view = CommentMapper.formatView({ ...base, status: 'deleted' });

    expect(view).toEqual({
      id: base._id,
      targetType: base.targetType,
      targetId: base.targetId,
      lessonId: base.lessonId,
      courseId: base.courseId,
      parentId: null,
      status: 'deleted',
      content: 'This comment has been deleted.',
      isAnonymous: true,
      isOwner: false,
      postType: base.postType,
      questionStatus: base.questionStatus,
      acceptedReplyId: undefined,
      replyCount: 0,
      createdAt: base.createdAt,
      updatedAt: base.updatedAt,
      deletedAt: undefined,
    });
    expect(view).not.toHaveProperty('codeShareId');
    expect(view).not.toHaveProperty('learningContext');
    expect(view).not.toHaveProperty('userId');
  });

  it('exposes ownership as a boolean without revealing an anonymous author id', () => {
    const view = CommentMapper.formatView(
      { ...base, isAnonymous: true },
      '64b000000000000000000004',
    );

    expect(view).toMatchObject({ isOwner: true, isAnonymous: true });
    expect(view).not.toHaveProperty('userId');
  });
});
