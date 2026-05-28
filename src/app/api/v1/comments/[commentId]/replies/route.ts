import { apiHandler } from '@/common/api-handler';
import { CommentController } from '@/modules/comment/controllers/comment.controller';

export const GET = apiHandler(CommentController.getReplies);
