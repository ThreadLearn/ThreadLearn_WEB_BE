import { ListCommentsService } from './list-comments.service';
import { ListRepliesService } from './list-replies.service';

describe('comment read access', () => {
  const repository = {
    listByTarget: jest.fn().mockResolvedValue({ data: [], total: 0 }),
    findTargetById: jest.fn(),
    listReplies: jest.fn().mockResolvedValue([]),
  };
  const learningAccess = {
    assertLessonInteractionAccess: jest.fn().mockResolvedValue({}),
    assertCourseInteractionAccess: jest.fn().mockResolvedValue({}),
  };

  beforeEach(() => jest.clearAllMocks());

  it('checks lesson interaction access before listing comments', async () => {
    const service = new ListCommentsService(repository as any, learningAccess as any);
    await service.execute('student-1', 'STUDENT', 'LESSON', '507f1f77bcf86cd799439012');

    expect(learningAccess.assertLessonInteractionAccess).toHaveBeenCalledWith(
      '507f1f77bcf86cd799439012',
      { id: 'student-1', role: 'STUDENT' },
    );
    expect(repository.listByTarget).toHaveBeenCalled();
  });

  it('checks the parent target access before listing replies, including tombstones', async () => {
    repository.findTargetById.mockResolvedValue({
      targetType: 'LESSON',
      targetId: '507f1f77bcf86cd799439012',
    });
    const service = new ListRepliesService(repository as any, learningAccess as any);
    await service.execute('admin-1', 'ADMIN', '507f1f77bcf86cd799439014');

    expect(learningAccess.assertLessonInteractionAccess).toHaveBeenCalledWith(
      '507f1f77bcf86cd799439012',
      { id: 'admin-1', role: 'ADMIN' },
    );
    expect(repository.listReplies).toHaveBeenCalledWith('507f1f77bcf86cd799439014', {
      id: 'admin-1',
      isAdmin: true,
      canModerate: true,
    });
  });
});
