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
    userRole: 'STUDENT' | 'ADMIN',
    input: Omit<CreateCommentInput, 'isAnonymous'> & { isAnonymous?: boolean },
  ) {
    const access = await this.checkTargetAccess(userId, userRole, input.targetType, String(input.targetId));
    // The discussion model supports a root comment and one visible reply level.
    // A reply-to-reply is attached to the same root instead of creating an
    // unbounded tree, as required by UC30.
    const parent = input.parentId ? await this.comments.findById(input.parentId) : null;
    if (input.parentId && !parent) throw new NotFoundError('Discussion not found.');
    if (parent && (parent.targetType !== input.targetType || parent.targetId !== String(input.targetId))) {
      throw new BadRequestError('Replies must stay in the same discussion room.');
    }
    const parentId = parent?.parentId ?? parent?.id ?? input.parentId;
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
    if (input.codeShareId) {
      if (!this.codeShares) throw new BadRequestError('Code sharing is unavailable.');
      await this.codeShares.assertAttachable(userId, userRole, input.codeShareId, input.targetType, String(input.targetId));
    }
    const created = await this.comments.create(
      CommentEntity.createNew({
        userId,
        targetType: input.targetType,
        targetId: input.targetId,
        courseId: access.courseId,
        content: input.content,
        parentId,
        isAnonymous: input.isAnonymous ?? false,
        mentionUserIds: input.mentionUserIds?.filter(isObjectId),
        postType: input.postType,
        codeShareId: input.codeShareId,
      }),
    );

    if (parentId) {
      const targetUserId = await this.comments.findReplyNotificationTarget(parentId, userId);
      if (targetUserId) {
        await NotificationsService.sendNotification({
          userId: targetUserId,
          title: input.postType === 'CODE_SOLUTION' ? 'New code solution' : 'New discussion reply',
          message: input.postType === 'CODE_SOLUTION' ? 'Someone submitted a verified code solution.' : 'Someone replied to your discussion.',
          type: input.postType === 'CODE_SOLUTION' ? 'CODE_SOLUTION_SUBMITTED' : 'DISCUSSION_REPLY',
          metadata: { commentId: created.id, parentId },
        });
      }
    }

    const view = await this.comments.findViewById(created.id);
    getSocketServer()?.to(discussionRoom(input.targetType, String(input.targetId))).emit('discussion:update', {
      targetType: input.targetType,
      targetId: String(input.targetId),
      action: parentId ? 'reply-created' : 'thread-created',
      discussionId: parentId ?? created.id,
    });
    return view;
  }

  private async checkTargetAccess(
    userId: string,
    userRole: 'STUDENT' | 'ADMIN',
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
}
