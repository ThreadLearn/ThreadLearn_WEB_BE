import { Inject, Injectable } from '@nestjs/common';
import { NotFoundError } from '../../../../common/custom-error';
import { NotificationsService } from '../../../notifications/services/notifications.service';
import {
  ILearningAccess,
  LEARNING_ACCESS,
} from '../../../../shared/domain/interfaces/learning-access.port';
import { CreateCommentDto } from '../dto/comment.dto';
import { CommentEntity, CommentTargetType } from '../../domain/entities/comment.entity';
import { COMMENT_REPOSITORY, ICommentRepository } from '../../domain/interfaces/comment.repository';

const isObjectId = (value: string) => /^[a-fA-F0-9]{24}$/.test(value);

@Injectable()
export class CreateCommentService {
  constructor(
    @Inject(COMMENT_REPOSITORY) private readonly comments: ICommentRepository,
    @Inject(LEARNING_ACCESS) private readonly learningAccess: ILearningAccess,
  ) {}

  async execute(userId: string, userRole: 'STUDENT' | 'ADMIN', input: CreateCommentDto) {
    const access = await this.checkTargetAccess(userId, userRole, input.targetType, String(input.targetId));
    const created = await this.comments.create(
      CommentEntity.createNew({
        userId,
        targetType: input.targetType,
        targetId: input.targetId,
        courseId: access.courseId,
        content: input.content,
        parentId: input.parentId,
        mentionUserIds: input.mentionUserIds?.filter(isObjectId),
      }),
    );

    if (input.parentId) {
      const targetUserId = await this.comments.findReplyNotificationTarget(input.parentId, userId);
      if (targetUserId) {
        await NotificationsService.sendNotification({
          userId: targetUserId,
          title: 'New comment reply',
          message: 'Someone replied to your lesson comment.',
          type: 'COMMENT_REPLY',
          metadata: { commentId: created.id, parentId: input.parentId },
        });
      }
    }

    return this.comments.findViewById(created.id);
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
