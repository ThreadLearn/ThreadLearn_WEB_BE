import { Inject, Injectable } from '@nestjs/common';
import mongoose from 'mongoose';
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '../../../../common/custom-error';
import { ILearningAccess, LEARNING_ACCESS } from '../../../../shared/domain/interfaces/learning-access.port';
import { Course } from '../../../courses/models/course.model';
import { discussionRoom, getSocketServer } from '../../../../socket';
import { CommentMapper } from '../../infrastructure/mapper/comment.mapper';
import { Comment } from '../../models/comment.model';
import { DiscussionReaction } from '../../models/discussion-reaction.model';
import { DiscussionReport, DiscussionReportReason } from '../../models/discussion-report.model';

type UserRole = 'STUDENT' | 'ADMIN';

@Injectable()
export class DiscussionEngagementService {
  constructor(@Inject(LEARNING_ACCESS) private readonly learningAccess: ILearningAccess) {}

  async toggleHelpful(userId: string, role: UserRole, commentId: string) {
    const comment = await this.findAccessibleComment(userId, role, commentId);
    if (String(comment.userId) === userId) throw new ForbiddenError('You cannot mark your own contribution as helpful.');

    const removed = await DiscussionReaction.findOneAndDelete({ commentId, userId, type: 'HELPFUL' });
    const delta = removed ? -1 : 1;
    if (!removed) {
      try {
        await DiscussionReaction.create({ commentId, userId, type: 'HELPFUL' });
      } catch (error: any) {
        if (error?.code !== 11000) throw error;
        throw new ConflictError('Helpful feedback was updated. Refresh and try again.');
      }
    }
    const updated = await Comment.findByIdAndUpdate(commentId, { $inc: { helpfulCount: delta, reactionCount: delta } }, { new: true })
      .populate('userId', 'firstName lastName avatarUrl');
    this.emit(comment, 'helpful-updated', commentId);
    return { helpful: !removed, comment: CommentMapper.formatView(updated) };
  }

  async report(userId: string, role: UserRole, commentId: string, input: { reason: DiscussionReportReason; details?: string }) {
    const comment = await this.findAccessibleComment(userId, role, commentId);
    if (String(comment.userId) === userId) throw new ForbiddenError('You cannot report your own contribution.');
    try {
      const report = await DiscussionReport.create({ commentId, reporterId: userId, reason: input.reason, details: input.details?.trim() });
      return { _id: String(report._id), status: report.status };
    } catch (error: any) {
      if (error?.code === 11000) throw new ConflictError('You have already reported this contribution.');
      throw error;
    }
  }

  async verify(userId: string, role: UserRole, commentId: string) {
    const comment = await this.findAccessibleComment(userId, role, commentId);
    await this.assertModerator(userId, role, comment);
    const updated = await Comment.findByIdAndUpdate(
      commentId,
      { $set: { instructorVerifiedAt: new Date(), instructorVerifiedBy: userId } },
      { new: true },
    ).populate('userId', 'firstName lastName avatarUrl');
    this.emit(comment, 'instructor-verified', commentId);
    return CommentMapper.formatView(updated);
  }

  async moderate(userId: string, role: UserRole, commentId: string, input: { action: 'HIDE' | 'RESTORE'; reason: string }) {
    const comment = await this.findAccessibleComment(userId, role, commentId);
    await this.assertModerator(userId, role, comment);
    const nextStatus = input.action === 'HIDE' ? 'hidden' : 'active';
    const updated = await Comment.findByIdAndUpdate(commentId, { $set: { status: nextStatus } }, { new: true })
      .populate('userId', 'firstName lastName avatarUrl');
    await DiscussionReport.updateMany({ commentId, status: 'OPEN' }, { $set: { status: 'RESOLVED' } });
    this.emit(comment, input.action === 'HIDE' ? 'moderated-hidden' : 'moderated-restored', commentId);
    return CommentMapper.formatView(updated);
  }

  private async findAccessibleComment(userId: string, role: UserRole, commentId: string) {
    if (!mongoose.isValidObjectId(commentId)) throw new BadRequestError('Invalid discussion id.');
    const comment = await Comment.findOne({ _id: commentId, status: { $ne: 'deleted' } });
    if (!comment) throw new NotFoundError('Discussion contribution not found.');
    if (comment.targetType === 'COURSE') {
      await this.learningAccess.assertCourseInteractionAccess(String(comment.targetId), { id: userId, role });
    } else {
      await this.learningAccess.assertLessonInteractionAccess(String(comment.targetId), { id: userId, role });
    }
    return comment;
  }

  private async assertModerator(userId: string, role: UserRole, comment: any) {
    if (role === 'ADMIN') return;
    const course = await Course.findById(comment.courseId).select('instructorId createdBy').lean();
    if (String(course?.instructorId ?? '') !== userId && String(course?.createdBy ?? '') !== userId) {
      throw new ForbiddenError('Only the course instructor or an administrator can moderate this discussion.');
    }
  }

  private emit(comment: any, action: string, discussionId: string) {
    getSocketServer()?.to(discussionRoom(comment.targetType, String(comment.targetId))).emit('discussion:update', {
      targetType: comment.targetType,
      targetId: String(comment.targetId),
      action,
      discussionId,
    });
  }
}
