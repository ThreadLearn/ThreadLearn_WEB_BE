import mongoose from 'mongoose';
import { Comment, CommentTargetType } from '../models/comment.model';
import { Course } from '../../courses/models/course.model';
import { Enrollment } from '../../enrollments/models/enrollment.model';
import { LessonsService } from '../../lessons/services/lessons.service';
import { Lesson } from '../../lessons/models/lesson.model';
import { NotificationsService } from '../../notifications/services/notifications.service';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../../common/custom-error';

interface CreateCommentInput {
  targetType: CommentTargetType;
  targetId:   string | mongoose.Types.ObjectId;
  content:    string;
  parentId?:  string;
  mentionUserIds?: string[];
}

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

export class CommentService {
  static async getCommentOrThrow(commentId: string) {
    if (!mongoose.isValidObjectId(commentId)) throw new NotFoundError('COMMENT_NOT_FOUND');
    const comment = await Comment.findById(commentId);
    if (!comment || comment.status === 'deleted') throw new NotFoundError('COMMENT_NOT_FOUND');
    return comment;
  }

  /** UC29 — list top-level comments for a target with pagination. */
  static async listComments(
    targetType: CommentTargetType,
    targetId: string,
    page = 1,
    limit = 10,
  ) {
    if (!targetType || !['COURSE', 'LESSON'].includes(targetType)) {
      throw new BadRequestError('targetType must be COURSE or LESSON.');
    }
    if (!targetId) throw new BadRequestError('targetId is required.');

    const skip  = (page - 1) * limit;
    const query = { targetType, targetId, parentId: null, status: { $ne: 'deleted' } };
    const [comments, total] = await Promise.all([
      Comment.find(query)
        .populate('userId', 'firstName lastName avatarUrl')
        .sort({ createdAt: -1 })
        .skip(skip).limit(limit).lean(),
      Comment.countDocuments(query),
    ]);
    return {
      data:    comments.map(formatComment),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /** UC30 — list replies under a parent comment. */
  static async listReplies(commentId: string) {
    if (!mongoose.isValidObjectId(commentId)) throw new NotFoundError('Comment not found.');
    const parent = await Comment.findById(commentId);
    if (!parent) throw new NotFoundError('Comment not found.');

    const replies = await Comment.find({ parentId: commentId, status: { $ne: 'deleted' } })
      .populate('userId', 'firstName lastName avatarUrl')
      .sort({ createdAt: 1 })
      .lean();
    return replies.map(formatComment);
  }

  /** UC29/UC30 — create comment or reply. */
  static async createComment(
    userId: string,
    userRole: 'STUDENT' | 'ADMIN',
    input: CreateCommentInput,
  ) {
    await this.checkTargetAccess(userId, userRole, input.targetType, String(input.targetId));

    if (input.parentId) {
      if (!mongoose.isValidObjectId(input.parentId)) {
        throw new BadRequestError('Invalid parentId format.');
      }
      const parent = await Comment.findById(input.parentId);
      if (!parent || parent.status === 'deleted') {
        throw new BadRequestError('Parent comment not found or has been deleted.');
      }
      if (parent.targetType !== input.targetType || String(parent.targetId) !== String(input.targetId)) {
        throw new BadRequestError('Parent comment does not belong to the same target.');
      }
    }

    const lesson = input.targetType === 'LESSON' ? await Lesson.findById(input.targetId).select('courseId') : null;
    const created = await Comment.create({
      userId,
      targetType: input.targetType,
      targetId:   input.targetId,
      lessonId: input.targetType === 'LESSON' ? input.targetId : undefined,
      courseId: input.targetType === 'COURSE' ? input.targetId : lesson?.courseId,
      content:    input.content,
      parentId:   input.parentId ? new mongoose.Types.ObjectId(input.parentId) : null,
      mentionUserIds: (input.mentionUserIds ?? []).filter((id) => mongoose.isValidObjectId(id)),
    });
    if (input.parentId) {
      const parent = await Comment.findById(input.parentId).select('userId');
      if (parent && parent.userId.toString() !== userId) {
        await NotificationsService.sendNotification({
          userId: parent.userId.toString(),
          title: 'New comment reply',
          message: 'Someone replied to your lesson comment.',
          type: 'COMMENT_REPLY',
          metadata: { commentId: created._id.toString(), parentId: input.parentId },
        });
      }
    }
    const populated = await Comment.findById(created._id)
      .populate('userId', 'firstName lastName avatarUrl').lean();
    return formatComment(populated);
  }

  /** UC31 — edit own comment (Admin may edit any). */
  static async updateComment(
    userId: string,
    userRole: 'STUDENT' | 'ADMIN',
    commentId: string,
    content: string,
  ) {
    if (!mongoose.isValidObjectId(commentId)) throw new NotFoundError('Comment not found.');
    const comment = await Comment.findById(commentId);
    if (!comment || comment.status === 'deleted') throw new NotFoundError('Comment not found.');
    if (userRole !== 'ADMIN' && comment.userId.toString() !== userId) {
      throw new ForbiddenError('You can only edit your own comments.');
    }
    comment.content  = content;
    comment.isEdited = true;
    comment.editedAt = new Date();
    await comment.save();
    const populated = await Comment.findById(comment._id)
      .populate('userId', 'firstName lastName avatarUrl').lean();
    return formatComment(populated);
  }

  /** UC32 — soft delete. */
  static async deleteComment(
    userId: string,
    userRole: 'STUDENT' | 'ADMIN',
    commentId: string,
  ) {
    if (!mongoose.isValidObjectId(commentId)) throw new NotFoundError('Comment not found.');
    const comment = await Comment.findById(commentId);
    if (!comment || comment.status === 'deleted') throw new NotFoundError('Comment not found.');
    if (userRole !== 'ADMIN' && comment.userId.toString() !== userId) {
      throw new ForbiddenError('You can only delete your own comments.');
    }
    comment.status    = 'deleted';
    comment.content   = '[Comment đã bị xóa]';
    comment.deletedAt = new Date();
    await comment.save();
    return { deleted: true };
  }

  /** BR — must enroll (or be Admin) to comment on a course/lesson. */
  private static async checkTargetAccess(
    userId: string,
    userRole: 'STUDENT' | 'ADMIN',
    targetType: CommentTargetType,
    targetId: string,
  ) {
    if (!mongoose.isValidObjectId(targetId)) {
      throw new NotFoundError(targetType === 'COURSE' ? 'Course not found.' : 'Lesson not found.');
    }
    if (targetType === 'COURSE') {
      const course = await Course.findById(targetId);
      if (!course || course.status === 'deleted') throw new NotFoundError('Course not found.');
      if (userRole === 'ADMIN') return;
      // BR: only currently-published courses accept new student comments.
      // Hidden/archived/draft → block (students can still read past comments).
      if (course.status !== 'published') {
        throw new ForbiddenError('Comments are disabled on this course.');
      }
      const enrolled = await Enrollment.findOne({ userId, courseId: targetId });
      if (!enrolled) throw new ForbiddenError('You must enroll to comment on this course.');
    } else {
      await LessonsService.assertLessonAccess(targetId, { id: userId, role: userRole });
    }
  }
}
export default CommentService;
