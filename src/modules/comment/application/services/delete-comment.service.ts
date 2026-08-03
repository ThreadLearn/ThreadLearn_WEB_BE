import { Inject, Injectable } from '@nestjs/common';
import { NotFoundError } from '../../../../common/custom-error';
import { COMMENT_REPOSITORY, ICommentRepository } from '../../domain/interfaces/comment.repository';
import { ILearningAccess, LEARNING_ACCESS } from '../../../../shared/domain/interfaces/learning-access.port';
import { Comment } from '../../models/comment.model';
import { discussionRoom, getSocketServer } from '../../../../socket';
import { randomUUID } from 'crypto';
import type { UserRole } from '../../../auth/domain/value-objects/user-role.vo';

@Injectable()
export class DeleteCommentService {
  constructor(
    @Inject(COMMENT_REPOSITORY) private readonly comments: ICommentRepository,
    @Inject(LEARNING_ACCESS) private readonly learningAccess: ILearningAccess,
  ) {}

  async execute(userId: string, userRole: UserRole, commentId: string) {
    const comment = await this.comments.findById(commentId);
    if (!comment) throw new NotFoundError('Comment not found.');
    await this.assertAccess(userId, userRole, comment.targetType, comment.targetId);
    comment.softDelete(userId, userRole);
    const updated = await this.comments.update(comment);
    if (comment.parentId) {
      await Comment.updateOne(
        { _id: comment.parentId },
        [{ $set: { replyCount: { $max: [0, { $subtract: [{ $ifNull: ['$replyCount', 0] }, 1] }] } } }],
      );
      await Comment.updateOne(
        { _id: comment.parentId, acceptedReplyId: comment.id },
        { $unset: { acceptedReplyId: 1 }, $set: { questionStatus: 'OPEN' } },
      );
    }
    getSocketServer()?.to(discussionRoom(comment.targetType, comment.targetId)).emit('discussion:update', {
      eventId: randomUUID(), eventType: 'comment-deleted', targetType: comment.targetType,
      targetId: comment.targetId, discussionId: comment.parentId ?? comment.id,
      version: updated.toProps().updatedAt?.toISOString() ?? new Date().toISOString(),
    });
    return { deleted: true };
  }

  private async assertAccess(userId: string, role: UserRole, targetType: 'COURSE' | 'LESSON', targetId: string) {
    if (targetType === 'COURSE') {
      await this.learningAccess.assertCourseInteractionAccess(targetId, { id: userId, role });
    } else {
      await this.learningAccess.assertLessonInteractionAccess(targetId, { id: userId, role });
    }
  }
}
