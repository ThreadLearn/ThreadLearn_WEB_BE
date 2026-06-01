import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import mongoose from 'mongoose';
import { IComment } from '../models/comment.model';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../../common/custom-error';

function formatComment(comment: any) {
  if (!comment) return null;
  const user = comment.userId;
  return {
    ...comment,
    userId:
      user && typeof user === 'object' && user.firstName !== undefined
        ? {
            _id:       user._id,
            fullName:  `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim(),
            avatarUrl: user.avatarUrl ?? null,
          }
        : user,
  };
}

@Injectable()
export class CommentService {
  constructor(
    @InjectModel('Comment')    private commentModel:    Model<IComment>,
    @InjectModel('Course')     private courseModel:     Model<any>,
    @InjectModel('Lesson')     private lessonModel:     Model<any>,
    @InjectModel('Enrollment') private enrollmentModel: Model<any>,
  ) {}

  async getComments(
    targetType: 'COURSE' | 'LESSON',
    targetId: string,
    page = 1,
    limit = 10,
  ) {
    if (!['COURSE', 'LESSON'].includes(targetType)) {
      throw new BadRequestError('targetType must be COURSE or LESSON.');
    }
    const skip  = (page - 1) * limit;
    const query = { targetType, targetId, parentId: null };

    const [comments, total] = await Promise.all([
      this.commentModel
        .find(query)
        .populate('userId', 'firstName lastName avatarUrl')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.commentModel.countDocuments(query),
    ]);

    const data = comments.map(formatComment);
    return { data, total, page, limit, hasMore: skip + data.length < total };
  }

  async getReplies(commentId: string) {
    if (!mongoose.isValidObjectId(commentId)) {
      throw new NotFoundError('Comment not found.');
    }
    const parent = await this.commentModel.findById(commentId);
    if (!parent) throw new NotFoundError('Comment not found.');

    const replies = await this.commentModel
      .find({ parentId: commentId })
      .populate('userId', 'firstName lastName avatarUrl')
      .sort({ createdAt: 1 })
      .lean();

    return replies.map(formatComment);
  }

  async createComment(
    userId: string,
    data: { targetType: 'COURSE' | 'LESSON'; targetId: string; content: string; parentId?: string },
    userRole: 'STUDENT' | 'ADMIN' = 'STUDENT',
  ) {
    await this.checkTargetAccess(userId, data.targetType, data.targetId, userRole);

    if (data.parentId) {
      if (!mongoose.isValidObjectId(data.parentId)) {
        throw new BadRequestError('Invalid parentId format.');
      }
      const parent = await this.commentModel.findById(data.parentId);
      if (!parent || parent.isDeleted) {
        throw new BadRequestError('Parent comment not found or has been deleted.');
      }
      if (parent.targetType !== data.targetType || parent.targetId !== data.targetId) {
        throw new BadRequestError('Parent comment does not belong to the same target.');
      }
    }

    const comment = await this.commentModel.create({
      userId,
      targetType: data.targetType,
      targetId:   data.targetId,
      content:    data.content,
      parentId:   data.parentId ? new mongoose.Types.ObjectId(data.parentId) : null,
    });

    const populated = await this.commentModel
      .findById(comment._id)
      .populate('userId', 'firstName lastName avatarUrl')
      .lean();

    return formatComment(populated);
  }

  async updateComment(
    commentId: string,
    userId: string,
    content: string,
    userRole: 'STUDENT' | 'ADMIN',
  ) {
    if (!mongoose.isValidObjectId(commentId)) throw new NotFoundError('Comment not found.');
    const comment = await this.commentModel.findById(commentId);
    if (!comment || comment.isDeleted) throw new NotFoundError('Comment not found.');

    if (userRole !== 'ADMIN' && comment.userId.toString() !== userId) {
      throw new ForbiddenError('You can only edit your own comments.');
    }

    comment.content = content;
    await comment.save();

    const populated = await this.commentModel
      .findById(commentId)
      .populate('userId', 'firstName lastName avatarUrl')
      .lean();

    return formatComment(populated);
  }

  async deleteComment(commentId: string, userId: string, userRole: 'STUDENT' | 'ADMIN') {
    if (!mongoose.isValidObjectId(commentId)) throw new NotFoundError('Comment not found.');
    const comment = await this.commentModel.findById(commentId);
    if (!comment || comment.isDeleted) throw new NotFoundError('Comment not found.');

    if (userRole !== 'ADMIN' && comment.userId.toString() !== userId) {
      throw new ForbiddenError('You can only delete your own comments.');
    }

    comment.isDeleted = true;
    comment.content   = '[Comment đã bị xóa]';
    await comment.save();
    return { success: true };
  }

  private async checkTargetAccess(
    userId: string,
    targetType: 'COURSE' | 'LESSON',
    targetId: string,
    userRole: 'STUDENT' | 'ADMIN' = 'STUDENT',
  ) {
    if (!mongoose.isValidObjectId(targetId)) {
      throw new NotFoundError(targetType === 'COURSE' ? 'Course not found.' : 'Lesson not found.');
    }

    if (targetType === 'COURSE') {
      const course = await this.courseModel.findById(targetId);
      if (!course) throw new NotFoundError('Course not found.');
      // UC30: Admin can reply/comment anywhere without enrollment.
      if (userRole === 'ADMIN') return;
      const enrolled = await this.enrollmentModel.findOne({ userId, courseId: targetId });
      if (!enrolled) throw new ForbiddenError('You must be enrolled to comment on this course.');
    } else {
      const lesson = await this.lessonModel.findById(targetId);
      if (!lesson) throw new NotFoundError('Lesson not found.');
      if (userRole === 'ADMIN') return;
      const enrolled = await this.enrollmentModel.findOne({ userId, courseId: lesson.courseId });
      if (!enrolled) throw new ForbiddenError('You must be enrolled to comment on this lesson.');
    }
  }
}
