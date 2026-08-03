import { Inject, Injectable } from '@nestjs/common';
import { BadRequestError, NotFoundError } from '../../../../common/custom-error';
import { NotificationsService } from '../../../notifications/services/notifications.service';
import {
  ILearningAccess,
  LEARNING_ACCESS,
} from '../../../../shared/domain/interfaces/learning-access.port';
import { CreateCommentDto } from '../dto/comment.dto';
import { CommentEntity, CommentPostType, CommentTargetType } from '../../domain/entities/comment.entity';
import { COMMENT_REPOSITORY, ICommentRepository } from '../../domain/interfaces/comment.repository';
import { CodeShareService } from '../../../code-share/application/services/code-share.service';
import { discussionRoom, getSocketServer } from '../../../../socket';
import { Comment } from '../../models/comment.model';
import { randomUUID } from 'crypto';
import type { UserRole } from '../../../auth/domain/value-objects/user-role.vo';

const isObjectId = (value: string) => /^[a-fA-F0-9]{24}$/.test(value);
type CreateCommentInput = Omit<CreateCommentDto, 'postType'> & { postType?: CommentPostType };

@Injectable()
export class CreateCommentService {
  constructor(
    @Inject(COMMENT_REPOSITORY) private readonly comments: ICommentRepository,
    @Inject(LEARNING_ACCESS) private readonly learningAccess: ILearningAccess,
    private readonly codeShares?: CodeShareService,
  ) {}

  async execute(
    userId: string,
    userRole: UserRole,
    input: Omit<CreateCommentInput, 'isAnonymous'> & { isAnonymous?: boolean },
  ) {
    const access = await this.checkTargetAccess(userId, userRole, input.targetType, String(input.targetId));
    await this.assertRateLimit(userId, Boolean(input.parentId));
    // The discussion model supports a root comment and one visible reply level.
    // A reply-to-reply is attached to the same root instead of creating an
    // unbounded tree, as required by UC30.
    const requestedParent = input.parentId ? await this.comments.findById(input.parentId) : null;
    const parent = requestedParent?.parentId
      ? await this.comments.findById(requestedParent.parentId)
      : requestedParent;
    if (input.parentId && !parent) throw new NotFoundError('Discussion not found.');
    if (parent && (parent.targetType !== input.targetType || parent.targetId !== String(input.targetId))) {
      throw new BadRequestError('Replies must stay in the same discussion room.');
    }
    const parentId = parent?.id ?? input.parentId;
    if (parentId && input.postType === 'CODE_SOLUTION' && !input.codeShareId) {
      throw new BadRequestError('A code solution requires a verified code share.');
    }
    if (!parentId && input.postType === 'CODE_SOLUTION') {
      throw new BadRequestError('Code solutions must be posted as replies.');
    }
    if (parentId && input.codeShareId && input.postType !== 'CODE_SOLUTION') {
      throw new BadRequestError('Attach code as a code solution.');
    }
    if (input.isAnonymous && input.codeShareId) {
      throw new BadRequestError('Code shares cannot be posted anonymously.');
    }
    let codeContext: {
      courseId?: string;
      lessonId?: string;
      exerciseId?: string;
      lessonVersionId?: string;
    } = {};
    if (input.codeShareId) {
      if (!this.codeShares) throw new BadRequestError('Code sharing is unavailable.');
      const share = await this.codeShares.assertAttachable(
        userId,
        userRole,
        input.codeShareId,
        input.targetType,
        String(input.targetId),
      );
      codeContext = {
        courseId: share.courseId,
        lessonId: share.lessonId,
        exerciseId: share.exerciseId,
        lessonVersionId: share.lessonVersionId,
      };
      if (!share.lessonId) {
        throw new BadRequestError('A code share must be linked to a lesson.');
      }
      if (input.targetType === 'LESSON' && share.lessonId !== String(input.targetId)) {
        throw new BadRequestError('Code share does not belong to this lesson.');
      }
      if (parentId) {
        if (!parent?.lessonId) {
          throw new BadRequestError('This discussion has no lesson context for a code solution.');
        }
        if (share.courseId !== parent.courseId || share.lessonId !== parent.lessonId) {
          throw new BadRequestError('Code solution must use the same course and lesson as the discussion.');
        }
        if (parent.exerciseId && share.exerciseId !== parent.exerciseId) {
          throw new BadRequestError('Code solution must use the same exercise as the discussion.');
        }
      }
    }
    const created = await this.comments.create(
      CommentEntity.createNew({
        userId,
        targetType: input.targetType,
        targetId: input.targetId,
        courseId: codeContext.courseId ?? access.courseId,
        lessonId: codeContext.lessonId,
        exerciseId: codeContext.exerciseId,
        lessonVersionId: codeContext.lessonVersionId,
        content: input.content,
        parentId,
        isAnonymous: input.isAnonymous ?? false,
        mentionUserIds: input.mentionUserIds?.filter(isObjectId),
        postType: input.postType,
        codeShareId: input.codeShareId,
        learningContext: input.learningContext,
      }),
    );

    if (parentId) {
      await Comment.updateOne({ _id: parentId }, { $inc: { replyCount: 1 } });
      const targetUserId = await this.comments.findReplyNotificationTarget(parentId, userId);
      if (targetUserId) {
        await NotificationsService.sendNotification({
          userId: targetUserId,
          title: input.postType === 'CODE_SOLUTION' ? 'New code solution' : 'New discussion reply',
          message: input.postType === 'CODE_SOLUTION' ? 'Someone submitted a verified code solution.' : 'Someone replied to your discussion.',
          type: input.postType === 'CODE_SOLUTION' ? 'CODE_SOLUTION_SUBMITTED' : 'DISCUSSION_REPLY',
          metadata: { commentId: created.id, parentId },
          eventKey: `discussion-reply:${created.id}`,
        });
      }
    }

    const view = await this.comments.findViewById(created.id, userId);
    getSocketServer()?.to(discussionRoom(input.targetType, String(input.targetId))).emit('discussion:update', {
      eventId: randomUUID(),
      eventType: parentId ? 'reply-created' : 'thread-created',
      targetType: input.targetType,
      targetId: String(input.targetId),
      discussionId: parentId ?? created.id,
      version: new Date().toISOString(),
    });
    return view;
  }

  private async checkTargetAccess(
    userId: string,
    userRole: UserRole,
    targetType: CommentTargetType,
    targetId: string,
  ): Promise<{ courseId?: string }> {
    if (!isObjectId(targetId)) {
      throw new NotFoundError(targetType === 'COURSE' ? 'Course not found.' : 'Lesson not found.');
    }
    if (targetType === 'COURSE') {
      await this.learningAccess.assertCourseInteractionAccess(targetId, { id: userId, role: userRole });
      return { courseId: targetId };
    }
    const lesson = await this.learningAccess.assertLessonInteractionAccess(targetId, { id: userId, role: userRole });
    return { courseId: lesson.courseId.toString() };
  }

  private async assertRateLimit(userId: string, isReply: boolean) {
    const windowStart = new Date(Date.now() - 5 * 60 * 1000);
    const limit = isReply ? 16 : 8;
    const count = await Comment.countDocuments({ userId, createdAt: { $gte: windowStart } });
    if (count >= limit) {
      throw new BadRequestError('You are posting too quickly. Please wait a few minutes before trying again.');
    }
  }
}
