import { Injectable } from '@nestjs/common';
import mongoose from 'mongoose';
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '../../../../common/custom-error';
import { NotificationsService } from '../../../notifications/services/notifications.service';
import { Comment } from '../../models/comment.model';
import { CodeShare } from '../../../code-share/models/code-share.model';
import { CommentMapper } from '../../infrastructure/mapper/comment.mapper';
import { discussionRoom, getSocketServer } from '../../../../socket';

type UserRole = 'STUDENT' | 'ADMIN';

@Injectable()
export class ManageDiscussionService {
  async accept(userId: string, role: UserRole, rootId: string, replyId: string) {
    this.assertIds(rootId, replyId);
    const [root, reply] = await Promise.all([
      Comment.findOne({ _id: rootId, parentId: null, status: { $ne: 'deleted' } }),
      Comment.findOne({ _id: replyId, parentId: rootId, status: { $ne: 'deleted' } }),
    ]);
    if (!root || !reply) throw new NotFoundError('Discussion or reply not found.');
    if (String(root.userId) !== userId) throw new ForbiddenError('Only the discussion author can accept a solution.');
    if (reply.postType === 'CODE_SOLUTION') {
      if (!reply.codeShareId || !(await CodeShare.exists({ _id: reply.codeShareId, authorId: reply.userId }))) {
        throw new BadRequestError('The code solution is not verified.');
      }
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
    if (role !== 'ADMIN' && String(root.userId) !== userId) throw new ForbiddenError('Only the discussion author can change its status.');
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
}
