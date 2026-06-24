import { Inject, Injectable } from '@nestjs/common';
import { BadRequestError } from '../../../../common/custom-error';
import { CommentTargetType } from '../../domain/entities/comment.entity';
import { COMMENT_REPOSITORY, ICommentRepository } from '../../domain/interfaces/comment.repository';

@Injectable()
export class ListCommentsService {
  constructor(@Inject(COMMENT_REPOSITORY) private readonly comments: ICommentRepository) {}

  async execute(targetType: CommentTargetType, targetId: string, page = 1, limit = 10) {
    if (!targetType || !['COURSE', 'LESSON'].includes(targetType)) {
      throw new BadRequestError('targetType must be COURSE or LESSON.');
    }
    if (!targetId) throw new BadRequestError('targetId is required.');
    return this.comments.listByTarget(targetType, targetId, page, limit);
  }
}
