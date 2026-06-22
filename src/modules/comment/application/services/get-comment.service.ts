import { Inject, Injectable } from '@nestjs/common';
import { NotFoundError } from '../../../../common/custom-error';
import { COMMENT_REPOSITORY, ICommentRepository } from '../../domain/interfaces/comment.repository';

@Injectable()
export class GetCommentService {
  constructor(@Inject(COMMENT_REPOSITORY) private readonly comments: ICommentRepository) {}

  async execute(commentId: string) {
    const comment = await this.comments.findById(commentId);
    if (!comment) throw new NotFoundError('COMMENT_NOT_FOUND');
    return comment;
  }
}
