import { BadRequestError, NotFoundError } from '../../../../common/custom-error';
import { ILearningAccess } from '../../../../shared/domain/interfaces/learning-access.port';
import { CodeShare } from '../../../code-share/models/code-share.model';
import { NotificationsService } from '../../../notifications/services/notifications.service';
import { Comment } from '../../models/comment.model';
import { ManageDiscussionService } from './manage-discussion.service';
import mongoose from 'mongoose';

jest.mock('../../../../socket', () => ({
  discussionRoom: (targetType: string, targetId: string) => `discussion:${targetType}:${targetId}`,
  getSocketServer: () => ({ to: () => ({ emit: jest.fn() }) }),
}));

describe('ManageDiscussionService accepted-solution integrity', () => {
  const ownerId = '507f1f77bcf86cd799439011';
  const solverId = '507f1f77bcf86cd799439012';
  const rootId = '507f1f77bcf86cd799439013';
  const replyId = '507f1f77bcf86cd799439014';
  const shareId = '507f1f77bcf86cd799439015';
  const courseId = '507f1f77bcf86cd799439016';
  const lessonId = '507f1f77bcf86cd799439017';
  const root = {
    _id: rootId, userId: ownerId, parentId: null, status: 'active', postType: 'CODE_HELP',
    questionStatus: 'OPEN', targetType: 'LESSON', targetId: lessonId, courseId, lessonId,
    exerciseId: 'exercise-1',
  };
  const reply = {
    _id: replyId, userId: solverId, parentId: rootId, status: 'active',
    postType: 'CODE_SOLUTION', codeShareId: shareId,
  };
  const updated = {
    ...root, acceptedReplyId: replyId, questionStatus: 'SOLVED',
    updatedAt: new Date('2026-07-30T00:00:00.000Z'),
  };
  let access: jest.Mocked<ILearningAccess>;
  let service: ManageDiscussionService;

  beforeEach(() => {
    jest.restoreAllMocks();
    access = {
      checkLessonAccess: jest.fn(), assertLessonAccess: jest.fn(), assertLessonViewAccess: jest.fn(),
      assertLessonInteractionAccess: jest.fn().mockResolvedValue({ id: lessonId, courseId }),
      assertCourseInteractionAccess: jest.fn(), touchLessonCursor: jest.fn(),
    } as any;
    service = new ManageDiscussionService(access);
    jest.spyOn(mongoose, 'startSession').mockResolvedValue({
      withTransaction: async (operation: () => Promise<void>) => operation(),
      endSession: async () => undefined,
    } as any);
    jest.spyOn(NotificationsService, 'createNotification').mockResolvedValue({ notification: {}, created: true } as any);
    jest.spyOn(NotificationsService, 'emitNotification').mockImplementation(() => undefined);
  });

  it('rejects a hidden/deleted reply before accepting it', async () => {
    jest.spyOn(Comment, 'findOne')
      .mockResolvedValueOnce(root as any)
      .mockResolvedValueOnce(null);
    await expect(service.accept(ownerId, 'STUDENT', rootId, replyId)).rejects.toBeInstanceOf(NotFoundError);
    expect(NotificationsService.createNotification).not.toHaveBeenCalled();
  });

  it('rejects a code share outside the root lesson/exercise context', async () => {
    jest.spyOn(Comment, 'findOne')
      .mockResolvedValueOnce(root as any)
      .mockResolvedValueOnce(reply as any);
    jest.spyOn(CodeShare, 'exists').mockResolvedValue(null);
    await expect(service.accept(ownerId, 'STUDENT', rootId, replyId)).rejects.toBeInstanceOf(BadRequestError);
    expect(CodeShare.exists).toHaveBeenCalledWith(expect.objectContaining({
      courseId, lessonId, exerciseId: 'exercise-1',
    }));
  });

  it('allows only one concurrent accept and emits one idempotent notification', async () => {
    jest.spyOn(Comment, 'findOne')
      .mockResolvedValueOnce(root as any).mockResolvedValueOnce(reply as any)
      .mockResolvedValueOnce(root as any).mockResolvedValueOnce(reply as any);
    jest.spyOn(CodeShare, 'exists').mockResolvedValue({ _id: shareId } as any);
    jest.spyOn(Comment, 'findOneAndUpdate')
      .mockResolvedValueOnce(updated as any)
      .mockResolvedValueOnce(null);

    const results = await Promise.allSettled([
      service.accept(ownerId, 'STUDENT', rootId, replyId),
      service.accept(ownerId, 'STUDENT', rootId, replyId),
    ]);

    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
    expect(NotificationsService.createNotification).toHaveBeenCalledTimes(1);
    expect(NotificationsService.createNotification).toHaveBeenCalledWith(expect.objectContaining({
      eventKey: `accepted:${rootId}:${replyId}`,
    }), expect.anything());
  });
});
