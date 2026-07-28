import { CommentEntity, CommentTargetType } from '../entities/comment.entity';

export interface CommentListResult {
  data: unknown[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ICommentRepository {
  findById(id: string): Promise<CommentEntity | null>;
  findTargetById(id: string): Promise<{ targetType: CommentTargetType; targetId: string } | null>;
  findViewById(id: string): Promise<unknown | null>;
  listByTarget(targetType: CommentTargetType, targetId: string, page: number, limit: number): Promise<CommentListResult>;
  listReplies(commentId: string): Promise<unknown[]>;
  create(comment: CommentEntity): Promise<CommentEntity>;
  update(comment: CommentEntity): Promise<CommentEntity>;
  findReplyNotificationTarget(parentId: string, replyingUserId: string): Promise<string | null>;
}

export const COMMENT_REPOSITORY = Symbol('COMMENT_REPOSITORY');
