import { apiHandler } from '@/common/api-handler';
import { CommentController } from '@/modules/comment/controllers/comment.controller';
import { createCommentSchema } from '@/modules/comment/validators/comment.validator';

export const GET = apiHandler(CommentController.getComments);

export const POST = apiHandler(CommentController.createComment, {
  requireAuth: true,
  allowedRoles: ['STUDENT'],
  schema: createCommentSchema,
});
