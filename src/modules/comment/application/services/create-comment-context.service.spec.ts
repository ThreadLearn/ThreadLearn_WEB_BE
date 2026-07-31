import { BadRequestError } from '../../../../common/custom-error';
import { ILearningAccess } from '../../../../shared/domain/interfaces/learning-access.port';
import { CodeShareService } from '../../../code-share/application/services/code-share.service';
import { CommentEntity } from '../../domain/entities/comment.entity';
import { ICommentRepository } from '../../domain/interfaces/comment.repository';
import { Comment } from '../../models/comment.model';
import { CreateCommentService } from './create-comment.service';

describe('CreateCommentService immutable code context', () => {
  const userId = '507f1f77bcf86cd799439011';
  const rootId = '507f1f77bcf86cd799439012';
  const courseId = '507f1f77bcf86cd799439013';
  const lessonId = '507f1f77bcf86cd799439014';
  const root = CommentEntity.fromPersistence({
    id: rootId, targetType: 'LESSON', targetId: lessonId, courseId, lessonId,
    exerciseId: 'exercise-1', userId: '507f1f77bcf86cd799439015', parentId: null,
    content: 'Help', isAnonymous: false, status: 'active', isEdited: false,
    mentionUserIds: [], postType: 'CODE_HELP', questionStatus: 'OPEN',
  });
  let repository: jest.Mocked<ICommentRepository>;
  let access: jest.Mocked<ILearningAccess>;
  let shares: jest.Mocked<CodeShareService>;
  let service: CreateCommentService;

  beforeEach(() => {
    jest.restoreAllMocks();
    jest.spyOn(Comment, 'countDocuments').mockResolvedValue(0);
    repository = {
      findById: jest.fn().mockResolvedValue(root), findTargetById: jest.fn(),
      findViewById: jest.fn(), listByTarget: jest.fn(), listReplies: jest.fn(),
      create: jest.fn(), update: jest.fn(), findReplyNotificationTarget: jest.fn(),
    } as any;
    access = {
      checkLessonAccess: jest.fn(), assertLessonAccess: jest.fn(), assertLessonViewAccess: jest.fn(),
      assertLessonInteractionAccess: jest.fn().mockResolvedValue({ id: lessonId, courseId }),
      assertCourseInteractionAccess: jest.fn(), touchLessonCursor: jest.fn(),
    } as any;
    shares = { assertAttachable: jest.fn() } as any;
    service = new CreateCommentService(repository, access, shares);
  });

  it('rejects a solution from a different exercise in the same lesson', async () => {
    shares.assertAttachable.mockResolvedValue({
      _id: '507f1f77bcf86cd799439016', authorId: userId, targetType: 'LESSON',
      targetId: lessonId, courseId, lessonId, exerciseId: 'exercise-2',
    } as any);

    await expect(service.execute(userId, 'STUDENT', {
      targetType: 'LESSON', targetId: lessonId, parentId: rootId,
      content: 'Solution', postType: 'CODE_SOLUTION', codeShareId: '507f1f77bcf86cd799439016',
    })).rejects.toBeInstanceOf(BadRequestError);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('does not allow a course-room solution when the root has no lesson context', async () => {
    const courseRoot = CommentEntity.fromPersistence({
      ...root.toProps(), id: rootId, targetType: 'COURSE', targetId: courseId,
      lessonId: undefined,
    });
    repository.findById.mockResolvedValue(courseRoot);
    access.assertCourseInteractionAccess.mockResolvedValue({ id: courseId } as any);
    shares.assertAttachable.mockResolvedValue({
      _id: '507f1f77bcf86cd799439016', authorId: userId, targetType: 'COURSE',
      targetId: courseId, courseId, lessonId, exerciseId: 'exercise-1',
    } as any);

    await expect(service.execute(userId, 'STUDENT', {
      targetType: 'COURSE', targetId: courseId, parentId: rootId,
      content: 'Solution', postType: 'CODE_SOLUTION', codeShareId: '507f1f77bcf86cd799439016',
    })).rejects.toBeInstanceOf(BadRequestError);
  });
});
