import { Inject, Injectable } from '@nestjs/common';
import { NotFoundError } from '../../../../common/custom-error';
import {
  ILearningAccess,
  LEARNING_ACCESS,
} from '../../../../shared/domain/interfaces/learning-access.port';
import { COMMENT_REPOSITORY, ICommentRepository } from '../../domain/interfaces/comment.repository';

@Injectable()
export class ListRepliesService {
  constructor(
    @Inject(COMMENT_REPOSITORY) private readonly comments: ICommentRepository,
    @Inject(LEARNING_ACCESS) private readonly learningAccess: ILearningAccess,
  ) {}

  async execute(userId: string, userRole: 'STUDENT' | 'ADMIN', commentId: string) {
    const target = await this.comments.findTargetById(commentId);
    if (!target) throw new NotFoundError('Comment not found.');
    if (target.targetType === 'LESSON') {
      await this.learningAccess.assertLessonInteractionAccess(target.targetId, { id: userId, role: userRole });
    } else {
      await this.learningAccess.assertCourseInteractionAccess(target.targetId, { id: userId, role: userRole });
    }
    return this.comments.listReplies(commentId);
  }
}
