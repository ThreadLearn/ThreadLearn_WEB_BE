import { Inject, Injectable } from '@nestjs/common';
import { NotFoundError } from '../../../../common/custom-error';
import { COMMENT_REPOSITORY, ICommentRepository } from '../../domain/interfaces/comment.repository';

@Injectable()
export class UpdateCommentService {
  constructor(@Inject(COMMENT_REPOSITORY) private readonly comments: ICommentRepository) {}

  async execute(userId: string, userRole: 'STUDENT' | 'ADMIN', commentId: string, content: string) {
    const comment = await this.comments.findById(commentId);
    if (!comment) throw new NotFoundError('Comment not found.');
    comment.ensureCanModify(userId, userRole);
    comment.edit(content);
    const updated = await this.comments.update(comment);
    return this.comments.findViewById(updated.id);
  }
}
