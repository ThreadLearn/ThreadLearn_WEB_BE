import { Inject, Injectable } from '@nestjs/common';
import mongoose from 'mongoose';
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '../../../../common/custom-error';
import { NotificationsService } from '../../../notifications/services/notifications.service';
import { Comment } from '../../models/comment.model';
import { CodeShare } from '../../../code-share/models/code-share.model';
import { CommentMapper } from '../../infrastructure/mapper/comment.mapper';
import { discussionRoom, getSocketServer } from '../../../../socket';
import { ILearningAccess, LEARNING_ACCESS } from '../../../../shared/domain/interfaces/learning-access.port';

type UserRole = 'STUDENT' | 'ADMIN';

@Injectable()
export class ManageDiscussionService {
  constructor(@Inject(LEARNING_ACCESS) private readonly learningAccess: ILearningAccess) {}

  async accept(userId: string, role: UserRole, rootId: string, replyId: string) {
    this.assertIds(rootId, replyId);
    const [root, reply] = await Promise.all([
      Comment.findOne({ _id: rootId, parentId: null, status: { $ne: 'deleted' } }),
      Comment.findOne({ _id: replyId, parentId: rootId, status: { $ne: 'deleted' } }),
    ]);
    if (!root || !reply) throw new NotFoundError('Discussion or reply not found.');
    await this.assertInteractionAccess(userId, role, root.targetType, String(root.targetId));
    if (String(root.userId) !== userId) throw new ForbiddenError('Only the discussion author can accept a solution.');
    if (!this.isQuestionPost(root.postType)) {
      throw new BadRequestError('Only a question or code review can accept a solution.');
    }
    if (reply.postType !== 'CODE_SOLUTION' || !reply.codeShareId) {
      throw new BadRequestError('Only a verified code solution can be accepted.');
    }
    if (!(await CodeShare.exists({ _id: reply.codeShareId, authorId: reply.userId, targetType: root.targetType, targetId: root.targetId }))) {
      throw new BadRequestError('The code solution is not verified for this discussion.');
    }
    const updated = await Comment.findOneAndUpdate(
      { _id: rootId, parentId: null, status: { $ne: 'deleted' }, questionStatus: 'OPEN', acceptedReplyId: { $exists: false } },
      { $set: { acceptedReplyId: reply._id, questionStatus: 'SOLVED' } },
      { new: true },
    ).populate('userId', 'firstName lastName avatarUrl');
    if (!updated) throw new ConflictError('This discussion was updated. Refresh and try again.', 'DISCUSSION_WRITE_CONFLICT');
    if (String(reply.userId) !== userId) {
      await NotificationsService.sendNotification({
        userId: String(reply.userId),
        type: 'CODE_SOLUTION_ACCEPTED',
        title: 'Your community solution was accepted',
        message: 'The discussion author accepted your response.',
        link: updated.lessonId ? `/lessons/${updated.lessonId}?discussion=${updated._id}` : undefined,
        metadata: { discussionId: String(updated._id), replyId: String(reply._id) },
      });
    }
    getSocketServer()?.to(discussionRoom(root.targetType, String(root.targetId))).emit('discussion:update', { targetType: root.targetType, targetId: String(root.targetId), action: 'solution-accepted', discussionId: rootId });
    return CommentMapper.formatView(updated);
  }

  async setStatus(userId: string, role: UserRole, rootId: string, status: 'CLOSED' | 'OPEN') {
    if (!mongoose.isValidObjectId(rootId)) throw new BadRequestError('Invalid discussion id.');
    const root = await Comment.findOne({ _id: rootId, parentId: null, status: { $ne: 'deleted' } });
    if (!root) throw new NotFoundError('Discussion not found.');
    await this.assertInteractionAccess(userId, role, root.targetType, String(root.targetId));
    if (role !== 'ADMIN' && String(root.userId) !== userId) throw new ForbiddenError('Only the discussion author can change its status.');
    if (!this.isQuestionPost(root.postType)) {
      throw new BadRequestError('Only a question or code review can be closed or reopened.');
    }
    if (status === 'OPEN' && root.questionStatus === 'SOLVED') {
      root.acceptedReplyId = undefined;
    }
    root.questionStatus = status;
    await root.save();
    getSocketServer()?.to(discussionRoom(root.targetType, String(root.targetId))).emit('discussion:update', { targetType: root.targetType, targetId: String(root.targetId), action: status === 'OPEN' ? 'reopened' : 'closed', discussionId: rootId });
    return CommentMapper.formatView(root);
  }

  private assertIds(rootId: string, replyId: string) {
    if (!mongoose.isValidObjectId(rootId) || !mongoose.isValidObjectId(replyId)) {
      throw new BadRequestError('Invalid discussion id.');
    }
  }

  private async assertInteractionAccess(userId: string, role: UserRole, targetType: 'COURSE' | 'LESSON', targetId: string) {
    if (targetType === 'COURSE') {
      await this.learningAccess.assertCourseInteractionAccess(targetId, { id: userId, role });
      return;
    }
    await this.learningAccess.assertLessonInteractionAccess(targetId, { id: userId, role });
  }

  private isQuestionPost(postType?: string) {
    return ['QUESTION', 'CODE_HELP', 'CODE_REVIEW', 'EXPLANATION_REQUEST'].includes(postType ?? 'GENERAL');
  }
}
