import { CommentEntity, CommentPostType, CommentQuestionStatus, CommentTargetType } from '../entities/comment.entity';

export interface CommentListResult {
  data: unknown[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CommentViewerContext {
  id: string;
  isAdmin?: boolean;
  canModerate?: boolean;
}

export interface ICommentRepository {
  findById(id: string): Promise<CommentEntity | null>;
  findTargetById(id: string): Promise<{ targetType: CommentTargetType; targetId: string } | null>;
  findViewById(id: string, viewer?: string | CommentViewerContext): Promise<unknown | null>;
  listByTarget(targetType: CommentTargetType, targetId: string, page: number, limit: number, filters?: { postType?: CommentPostType; questionStatus?: CommentQuestionStatus }, viewer?: string | CommentViewerContext): Promise<CommentListResult>;
  listReplies(commentId: string, viewer?: string | CommentViewerContext): Promise<unknown[]>;
  create(comment: CommentEntity): Promise<CommentEntity>;
  update(comment: CommentEntity): Promise<CommentEntity>;
  findReplyNotificationTarget(parentId: string, replyingUserId: string): Promise<string | null>;
}

export const COMMENT_REPOSITORY = Symbol('COMMENT_REPOSITORY');
