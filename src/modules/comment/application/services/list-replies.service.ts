import { Inject, Injectable } from '@nestjs/common';
import { COMMENT_REPOSITORY, ICommentRepository } from '../../domain/interfaces/comment.repository';

@Injectable()
export class ListRepliesService {
  constructor(@Inject(COMMENT_REPOSITORY) private readonly comments: ICommentRepository) {}

  async execute(commentId: string) {
    return this.comments.listReplies(commentId);
  }
}
