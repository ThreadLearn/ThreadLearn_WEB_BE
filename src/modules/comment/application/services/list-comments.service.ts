import { Inject, Injectable } from '@nestjs/common';
import { BadRequestError } from '../../../../common/custom-error';
import {
  ILearningAccess,
  LEARNING_ACCESS,
} from '../../../../shared/domain/interfaces/learning-access.port';
import { CommentTargetType } from '../../domain/entities/comment.entity';
import { COMMENT_REPOSITORY, ICommentRepository } from '../../domain/interfaces/comment.repository';

@Injectable()
export class ListCommentsService {
  constructor(
    @Inject(COMMENT_REPOSITORY) private readonly comments: ICommentRepository,
    @Inject(LEARNING_ACCESS) private readonly learningAccess: ILearningAccess,
  ) {}

  async execute(
    userId: string,
    userRole: 'STUDENT' | 'ADMIN',
    targetType: CommentTargetType,
    targetId: string,
    page = 1,
    limit = 10,
    filters?: { postType?: import('../../domain/entities/comment.entity').CommentPostType; questionStatus?: import('../../domain/entities/comment.entity').CommentQuestionStatus },
  ) {
    if (!targetType || !['COURSE', 'LESSON'].includes(targetType)) {
      throw new BadRequestError('targetType must be COURSE or LESSON.');
    }
    if (!targetId) throw new BadRequestError('targetId is required.');
    const course = targetType === 'LESSON'
      ? await this.learningAccess.assertCourseInteractionAccess(
        (await this.learningAccess.assertLessonInteractionAccess(targetId, { id: userId, role: userRole })).courseId,
        { id: userId, role: userRole },
      )
      : await this.learningAccess.assertCourseInteractionAccess(targetId, { id: userId, role: userRole });
    const canModerate = userRole === 'ADMIN' || course.instructorId === userId || course.createdBy === userId;
    const result = await this.comments.listByTarget(targetType, targetId, page, limit, filters, {
      id: userId,
      isAdmin: userRole === 'ADMIN',
      canModerate,
    });
    return {
      ...result,
      capabilities: { canModerate, canVerify: canModerate },
    };
  }
}
