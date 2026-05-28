import { apiHandler } from '@/common/api-handler';
import { CommentController } from '@/modules/comment/controllers/comment.controller';
import { updateCommentSchema } from '@/modules/comment/validators/comment.validator';

export const PATCH = apiHandler(CommentController.updateComment, {
  requireAuth: true,
  allowedRoles: ['STUDENT', 'ADMIN'],
  schema: updateCommentSchema,
});

export const DELETE = apiHandler(CommentController.deleteComment, {
  requireAuth: true,
  allowedRoles: ['STUDENT', 'ADMIN'],
});
