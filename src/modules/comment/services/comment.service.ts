import mongoose from 'mongoose';
import { Comment } from '../models/comment.model';
import { Course } from '../../courses/models/course.model';
import { Lesson } from '../../lessons/models/lesson.model';
import { Enrollment } from '../../enrollments/models/enrollment.model';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../../common/custom-error';

function formatComment(comment: any) {
  if (!comment) return null;
  const user = comment.userId;
  return {
    ...comment,
    userId: user && typeof user === 'object' && user.firstName !== undefined
      ? {
          _id: user._id,
          fullName: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim(),
          avatarUrl: user.avatarUrl ?? null,
        }
      : user,
  };
}

export class CommentService {
  static async getComments(
    targetType: 'COURSE' | 'LESSON',
    targetId: string,
    page = 1,
    limit = 10
  ) {
    const skip = (page - 1) * limit;
    const query = { targetType, targetId, parentId: null };

    const [comments, total] = await Promise.all([
      Comment.find(query)
        .populate('userId', 'firstName lastName avatarUrl')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Comment.countDocuments(query),
    ]);

    const data = comments.map(formatComment);
    return {
      data,
      total,
      page,
      limit,
      hasMore: skip + data.length < total,
    };
  }

  static async getReplies(commentId: string) {
    if (!mongoose.isValidObjectId(commentId)) {
      throw new NotFoundError('Comment not found.');
    }

    const parent = await Comment.findById(commentId);
    if (!parent) {
      throw new NotFoundError('Comment not found.');
    }

    const replies = await Comment.find({ parentId: commentId })
      .populate('userId', 'firstName lastName avatarUrl')
      .sort({ createdAt: 1 })
      .lean();

    return replies.map(formatComment);
  }

  static async createComment(
    userId: string,
    data: {
      targetType: 'COURSE' | 'LESSON';
      targetId: string;
      content: string;
      parentId?: string;
    }
  ) {
    // BR-26: Verify target exists and student is enrolled
    await CommentService.checkTargetAccess(userId, data.targetType, data.targetId);

    // BR-28: Validate parentId if provided
    if (data.parentId) {
      if (!mongoose.isValidObjectId(data.parentId)) {
        throw new BadRequestError('Invalid parentId format.');
      }
      const parent = await Comment.findById(data.parentId);
      if (!parent || parent.isDeleted) {
        throw new BadRequestError('Parent comment not found or has been deleted.');
      }
      if (parent.targetType !== data.targetType || parent.targetId !== data.targetId) {
        throw new BadRequestError('Parent comment does not belong to the same target.');
      }
    }

    const comment = await Comment.create({
      userId,
      targetType: data.targetType,
      targetId: data.targetId,
      content: data.content,
      parentId: data.parentId ? new mongoose.Types.ObjectId(data.parentId) : null,
    });

    const populated = await Comment.findById(comment._id)
      .populate('userId', 'firstName lastName avatarUrl')
      .lean();

    return formatComment(populated);
  }

  static async updateComment(
    commentId: string,
    userId: string,
    content: string,
    userRole: 'STUDENT' | 'ADMIN'
  ) {
    if (!mongoose.isValidObjectId(commentId)) {
      throw new NotFoundError('Comment not found.');
    }

    const comment = await Comment.findById(commentId);
    if (!comment || comment.isDeleted) {
      throw new NotFoundError('Comment not found.');
    }

    // BR-27: Student can only edit their own; Admin can edit any
    if (userRole !== 'ADMIN' && comment.userId.toString() !== userId) {
      throw new ForbiddenError('You can only edit your own comments.');
    }

    comment.content = content;
    await comment.save();

    const populated = await Comment.findById(commentId)
      .populate('userId', 'firstName lastName avatarUrl')
      .lean();

    return formatComment(populated);
  }

  static async deleteComment(commentId: string, userId: string, userRole: 'STUDENT' | 'ADMIN') {
    if (!mongoose.isValidObjectId(commentId)) {
      throw new NotFoundError('Comment not found.');
    }

    const comment = await Comment.findById(commentId);
    if (!comment || comment.isDeleted) {
      throw new NotFoundError('Comment not found.');
    }

    // BR-27: Admin can delete any; Student can only delete their own
    if (userRole !== 'ADMIN' && comment.userId.toString() !== userId) {
      throw new ForbiddenError('You can only delete your own comments.');
    }

    // Soft delete — keep document to preserve thread structure
    comment.isDeleted = true;
    comment.content = '[Comment đã bị xóa]';
    await comment.save();

    return { success: true };
  }

  private static async checkTargetAccess(
    userId: string,
    targetType: 'COURSE' | 'LESSON',
    targetId: string
  ) {
    if (!mongoose.isValidObjectId(targetId)) {
      throw new NotFoundError(targetType === 'COURSE' ? 'Course not found.' : 'Lesson not found.');
    }

    if (targetType === 'COURSE') {
      const course = await Course.findById(targetId);
      if (!course) throw new NotFoundError('Course not found.');

      const enrolled = await Enrollment.findOne({ userId, courseId: targetId });
      if (!enrolled) throw new ForbiddenError('You must be enrolled in this course to comment.');
    } else {
      const lesson = await Lesson.findById(targetId);
      if (!lesson) throw new NotFoundError('Lesson not found.');

      const enrolled = await Enrollment.findOne({ userId, courseId: lesson.courseId });
      if (!enrolled)
        throw new ForbiddenError('You must be enrolled in this course to comment on its lessons.');
    }
  }
}

export default CommentService;
