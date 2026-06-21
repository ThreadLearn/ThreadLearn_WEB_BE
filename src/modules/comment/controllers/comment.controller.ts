import {
  Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiResponse } from '../../../common/api-response';
import { BadRequestError } from '../../../common/custom-error';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import type { AuthenticatedUser } from '../../../common/api-handler';
import { CommentService } from '../services/comment.service';
import {
  commentIdParamSchema,
  createCommentSchema,
  listCommentsQuerySchema,
  updateCommentSchema,
} from '../validators/comment.validator';

@ApiTags('Comments')
@Controller('v1/comments')
export class CommentController {
  constructor(private readonly comments: CommentService) {}

  @Get()
  @ApiOperation({ summary: 'UC29 — list comments by target.' })
  async listComments(
    @Query(new ZodValidationPipe(listCommentsQuerySchema))
    query: { targetType: 'COURSE' | 'LESSON'; targetId: string; page: number; limit: number },
  ) {
    const result = await this.comments.listComments(
      query.targetType, query.targetId, query.page, query.limit,
    );
    return ApiResponse.success({
      message: 'Comments fetched.',
      data:    result.data,
      meta:    { page: result.page, limit: result.limit, total: result.total, totalPages: result.totalPages },
    });
  }

  @Get(':commentId/replies')
  @ApiOperation({ summary: 'UC30 — list replies of a comment.' })
  async listReplies(@Param('commentId', new ZodValidationPipe(commentIdParamSchema)) commentId: string) {
    const replies = await this.comments.listReplies(commentId);
    return ApiResponse.success({ message: 'Replies fetched.', data: replies });
  }

  @Post()
  @UseGuards(JwtAuthGuard) @ApiBearerAuth('BearerAuth')
  @ApiOperation({ summary: 'UC29 / UC30 — create comment or reply.' })
  async createComment(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createCommentSchema))
    body: { targetType: 'COURSE' | 'LESSON'; targetId: string; content: string; parentId?: string; mentionUserIds?: string[] },
  ) {
    if (!user) throw new BadRequestError('User context required.');
    const data = await this.comments.createComment(user.id, user.role, body);
    return ApiResponse.success({ message: 'Comment created.', data, statusCode: 201 });
  }

  @Post(':commentId/replies')
  @UseGuards(JwtAuthGuard) @ApiBearerAuth('BearerAuth')
  @ApiOperation({ summary: 'UC30 - reply to a comment.' })
  async reply(
    @CurrentUser() user: AuthenticatedUser,
    @Param('commentId', new ZodValidationPipe(commentIdParamSchema)) commentId: string,
    @Body(new ZodValidationPipe(updateCommentSchema)) body: { content: string },
  ) {
    if (!user) throw new BadRequestError('User context required.');
    const parent = await this.comments.getCommentOrThrow(commentId);
    const data = await this.comments.createComment(user.id, user.role, {
      targetType: parent.targetType,
      targetId: String(parent.targetId),
      content: body.content,
      parentId: commentId,
    });
    return ApiResponse.success({ message: 'Reply created.', data, statusCode: 201 });
  }

  @Patch(':commentId')
  @UseGuards(JwtAuthGuard) @ApiBearerAuth('BearerAuth')
  @ApiOperation({ summary: 'UC31 — edit own comment (Admin override).' })
  async updateComment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('commentId', new ZodValidationPipe(commentIdParamSchema)) commentId: string,
    @Body(new ZodValidationPipe(updateCommentSchema)) body: { content: string },
  ) {
    if (!user) throw new BadRequestError('User context required.');
    const data = await this.comments.updateComment(user.id, user.role, commentId, body.content);
    return ApiResponse.success({ message: 'Comment updated.', data });
  }

  @Delete(':commentId')
  @UseGuards(JwtAuthGuard) @ApiBearerAuth('BearerAuth')
  @ApiOperation({ summary: 'UC32 — soft delete comment.' })
  async deleteComment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('commentId', new ZodValidationPipe(commentIdParamSchema)) commentId: string,
  ) {
    if (!user) throw new BadRequestError('User context required.');
    await this.comments.deleteComment(user.id, user.role, commentId);
    return ApiResponse.success({ message: 'Comment deleted.' });
  }
}

@ApiTags('Lessons')
@Controller('v1/lessons')
export class LessonCommentsController {
  constructor(private readonly comments: CommentService) {}

  @Get(':id/comments')
  async lessonComments(
    @Param('id') id: string,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
  ) {
    const result = await this.comments.listComments('LESSON', id, Number(page), Number(limit));
    return ApiResponse.success({
      message: 'Comments fetched.',
      data: result.data,
      meta: { page: result.page, limit: result.limit, total: result.total, totalPages: result.totalPages },
    });
  }

  @Post(':id/comments')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('BearerAuth')
  async createLessonComment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: { content: string; parentId?: string },
  ) {
    const comment = await this.comments.createComment(user.id, user.role, {
      targetType: 'LESSON',
      targetId: id,
      content: body.content,
      parentId: body.parentId,
    });
    return ApiResponse.success({ message: 'Comment created.', data: comment, statusCode: 201 });
  }
}
