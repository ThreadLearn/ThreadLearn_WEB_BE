import { Inject, Injectable } from '@nestjs/common';
import { NotFoundError } from '../../../../common/custom-error';
import {
  ILearningAccess,
  LEARNING_ACCESS,
} from '../../../../shared/domain/interfaces/learning-access.port';
import { COMMENT_REPOSITORY, ICommentRepository } from '../../domain/interfaces/comment.repository';
import type { UserRole } from '../../../auth/domain/value-objects/user-role.vo';

@Injectable()
export class ListRepliesService {
  constructor(
    @Inject(COMMENT_REPOSITORY) private readonly comments: ICommentRepository,
    @Inject(LEARNING_ACCESS) private readonly learningAccess: ILearningAccess,
  ) {}

  async execute(userId: string, userRole: UserRole, commentId: string) {
    const target = await this.comments.findTargetById(commentId);
    if (!target) throw new NotFoundError('Comment not found.');
    const course = target.targetType === 'LESSON'
      ? await this.learningAccess.assertCourseInteractionAccess(
        (await this.learningAccess.assertLessonInteractionAccess(target.targetId, { id: userId, role: userRole })).courseId,
        { id: userId, role: userRole },
      )
      : await this.learningAccess.assertCourseInteractionAccess(target.targetId, { id: userId, role: userRole });
    const canModerate = userRole === 'ADMIN' || course.instructorId === userId || course.createdBy === userId;
    return this.comments.listReplies(commentId, {
      id: userId,
      isAdmin: userRole === 'ADMIN',
      canModerate,
    });
  }
}
