import { AuthenticatedNextRequest } from '../../../common/api-handler';
import { ApiResponse } from '../../../common/api-response';
import { CommentService } from '../services/comment.service';

export class CommentController {
  static async getComments(req: AuthenticatedNextRequest) {
    const { searchParams } = req.nextUrl;
    const targetType = searchParams.get('targetType') as 'COURSE' | 'LESSON';
    const targetId = searchParams.get('targetId') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '10', 10), 50);

    const result = await CommentService.getComments(targetType, targetId, page, limit);

    return ApiResponse.success({
      message: 'Comments fetched successfully.',
      data: result.data,
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        hasMore: result.hasMore,
      },
    });
  }

  static async getReplies(
    req: AuthenticatedNextRequest,
    { params }: { params: { commentId: string } }
  ) {
    const replies = await CommentService.getReplies(params.commentId);

    return ApiResponse.success({
      message: 'Replies fetched successfully.',
      data: replies,
    });
  }

  static async createComment(req: AuthenticatedNextRequest) {
    const { id: userId } = req.user!;
    const body = await req.json();

    const comment = await CommentService.createComment(userId, {
      targetType: body.targetType,
      targetId: body.targetId,
      content: body.content,
      parentId: body.parentId,
    });

    return ApiResponse.success({
      message: 'Comment created successfully.',
      data: comment,
      statusCode: 201,
    });
  }

  static async updateComment(
    req: AuthenticatedNextRequest,
    { params }: { params: { commentId: string } }
  ) {
    const { id: userId, role: userRole } = req.user!;
    const { content } = await req.json();

    const comment = await CommentService.updateComment(
      params.commentId,
      userId,
      content,
      userRole
    );

    return ApiResponse.success({
      message: 'Comment updated successfully.',
      data: comment,
    });
  }

  static async deleteComment(
    req: AuthenticatedNextRequest,
    { params }: { params: { commentId: string } }
  ) {
    const { id: userId, role: userRole } = req.user!;

    await CommentService.deleteComment(params.commentId, userId, userRole);

    return ApiResponse.success({
      message: 'Comment deleted successfully.',
    });
  }
}

export default CommentController;
