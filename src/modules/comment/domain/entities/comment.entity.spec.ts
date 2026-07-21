import { CommentEntity } from './comment.entity';

describe('CommentEntity anonymity', () => {
  const baseInput = {
    targetType: 'LESSON' as const,
    targetId: '507f1f77bcf86cd799439011',
    userId: '507f1f77bcf86cd799439012',
    content: 'A comment about the lesson',
  };

  it('keeps identity visible by default', () => {
    expect(CommentEntity.createNew(baseInput).toProps().isAnonymous).toBe(false);
  });

  it('persists an explicit anonymous choice without removing ownership', () => {
    const comment = CommentEntity.createNew({ ...baseInput, isAnonymous: true });

    expect(comment.toProps()).toMatchObject({
      userId: baseInput.userId,
      isAnonymous: true,
    });
  });
});
