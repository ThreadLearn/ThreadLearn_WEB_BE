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
import { DiscussionModerationAudit } from '../../models/discussion-moderation-audit.model';
import { NotificationsService } from '../../../notifications/services/notifications.service';
import { randomUUID } from 'crypto';

type UserRole = 'STUDENT' | 'ADMIN';

@Injectable()
export class DiscussionEngagementService {
  constructor(@Inject(LEARNING_ACCESS) private readonly learningAccess: ILearningAccess) {}

  async toggleHelpful(userId: string, role: UserRole, commentId: string) {
    const comment = await this.findAccessibleComment(userId, role, commentId);
    if (String(comment.userId) === userId) throw new ForbiddenError('You cannot mark your own contribution as helpful.');
    const session = await mongoose.startSession();
    let helpful = false;
    try {
      await session.withTransaction(async () => {
        const existing = await DiscussionReaction.findOne({ commentId, userId, type: 'HELPFUL' }).session(session);
        helpful = !existing;
        if (existing) {
          await DiscussionReaction.deleteOne({ _id: existing._id }, { session });
        } else {
          await DiscussionReaction.create([{ commentId, userId, type: 'HELPFUL' }], { session });
        }
        const delta = helpful ? 1 : -1;
        await Comment.updateOne(
          { _id: commentId },
          [{
            $set: {
              helpfulCount: { $max: [0, { $add: [{ $ifNull: ['$helpfulCount', 0] }, delta] }] },
              reactionCount: { $max: [0, { $add: [{ $ifNull: ['$reactionCount', 0] }, delta] }] },
            },
          }],
          { session },
        );
      });
    } catch (error: any) {
      if (error?.code === 11000) throw new ConflictError('Helpful feedback was updated. Refresh and try again.');
      throw error;
    } finally {
      await session.endSession();
    }
    const updated = await Comment.findById(commentId).populate('userId', 'firstName lastName avatarUrl');
    this.emit(comment, 'helpful-updated', commentId);
    return { helpful, comment: CommentMapper.formatView(updated, userId) };
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

  async listModerationQueue(
    userId: string,
    role: UserRole,
    input: {
      page: number;
      limit: number;
      status?: 'OPEN' | 'RESOLVED';
      reason?: DiscussionReportReason;
      courseId?: string;
      lessonId?: string;
      createdFrom?: Date;
      createdTo?: Date;
    },
  ) {
    const courseScope: Record<string, unknown> = {};
    if (role !== 'ADMIN') {
      const owned = await Course.find({ $or: [{ instructorId: userId }, { createdBy: userId }] })
        .select('_id')
        .lean();
      const ownedIds = owned.map((course) => course._id);
      if (!ownedIds.length) {
        throw new ForbiddenError('Only a course instructor or administrator can view moderation reports.');
      }
      if (input.courseId && !ownedIds.some((id) => String(id) === input.courseId)) {
        throw new ForbiddenError('You can only moderate courses assigned to you.');
      }
      courseScope.courseId = input.courseId ?? { $in: ownedIds };
    } else if (input.courseId) {
      courseScope.courseId = input.courseId;
    }
    if (input.lessonId) courseScope.lessonId = input.lessonId;
    const commentIds = await Comment.find(courseScope).distinct('_id');
    const reportQuery: Record<string, unknown> = { commentId: { $in: commentIds } };
    if (input.status) reportQuery.status = input.status;
    if (input.reason) reportQuery.reason = input.reason;
    if (input.createdFrom || input.createdTo) {
      reportQuery.createdAt = {
        ...(input.createdFrom ? { $gte: input.createdFrom } : {}),
        ...(input.createdTo ? { $lte: input.createdTo } : {}),
      };
    }
    const skip = (input.page - 1) * input.limit;
    const [reports, total] = await Promise.all([
      DiscussionReport.find(reportQuery)
        .populate({ path: 'commentId', populate: { path: 'userId', select: 'firstName lastName avatarUrl' } })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(input.limit)
        .lean(),
      DiscussionReport.countDocuments(reportQuery),
    ]);
    return {
      data: reports.map((report: any) => ({
        id: String(report._id),
        reason: report.reason,
        details: report.details,
        status: report.status,
        createdAt: report.createdAt,
        comment: CommentMapper.formatView(report.commentId, userId),
      })),
      meta: {
        page: input.page,
        limit: input.limit,
        total,
        totalPages: Math.ceil(total / input.limit),
      },
    };
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
    const expectedStatus = input.action === 'HIDE' ? 'active' : 'hidden';
    const session = await mongoose.startSession();
    let updated: any;
    let auditId = '';
    try {
      await session.withTransaction(async () => {
        updated = await Comment.findOneAndUpdate(
          { _id: commentId, status: expectedStatus },
          { $set: { status: nextStatus } },
          { new: true, session },
        ).populate('userId', 'firstName lastName avatarUrl');
        if (!updated) throw new ConflictError('Moderation state changed. Refresh and try again.');
        const [audit] = await DiscussionModerationAudit.create([{
          commentId,
          courseId: comment.courseId,
          lessonId: comment.lessonId,
          moderatorId: userId,
          action: input.action,
          reason: input.reason.trim(),
        }], { session });
        auditId = String(audit._id);
        if (comment.parentId) {
          await Comment.updateOne(
            { _id: comment.parentId },
            { $inc: { replyCount: input.action === 'HIDE' ? -1 : 1 } },
            { session },
          );
          if (input.action === 'HIDE') {
            await Comment.updateOne(
              { _id: comment.parentId, acceptedReplyId: commentId },
              { $unset: { acceptedReplyId: 1 }, $set: { questionStatus: 'OPEN' } },
              { session },
            );
          }
        }
        await DiscussionReport.updateMany(
          { commentId, status: 'OPEN' },
          { $set: { status: 'RESOLVED' } },
          { session },
        );
      });
    } finally {
      await session.endSession();
    }
    if (String(comment.userId) !== userId) {
      await NotificationsService.sendNotification({
        userId: String(comment.userId),
        type: 'DISCUSSION_MODERATED',
        title: input.action === 'HIDE' ? 'Discussion contribution hidden' : 'Discussion contribution restored',
        message: input.reason.trim(),
        metadata: { commentId, action: input.action, auditId },
        eventKey: `moderation:${commentId}:${auditId}`,
      });
    }
    this.emit(comment, input.action === 'HIDE' ? 'moderated-hidden' : 'moderated-restored', commentId);
    return CommentMapper.formatView(updated, userId);
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
      eventId: randomUUID(),
      eventType: action,
      targetType: comment.targetType,
      targetId: String(comment.targetId),
      discussionId,
      version: new Date().toISOString(),
    });
  }
}
