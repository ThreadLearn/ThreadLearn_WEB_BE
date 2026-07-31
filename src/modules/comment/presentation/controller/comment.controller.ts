import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedUser } from '../../../../common/api-handler';
import { ApiResponse } from '../../../../common/api-response';
import { BadRequestError } from '../../../../common/custom-error';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { ZodValidationPipe } from '../../../../common/pipes/zod-validation.pipe';
import {
  CreateCommentDto,
  CreateReplyDto,
  ListCommentsQueryDto,
  UpdateCommentDto,
  commentIdParamSchema,
  createCommentSchema,
  createLessonCommentSchema,
  createReplySchema,
  moderationSchema,
  moderationQueueSchema,
  reportDiscussionSchema,
  listCommentsQuerySchema,
  updateCommentSchema,
} from '../../application/dto/comment.dto';
import { CreateCommentService } from '../../application/services/create-comment.service';
import { DeleteCommentService } from '../../application/services/delete-comment.service';
import { GetCommentService } from '../../application/services/get-comment.service';
import { ListCommentsService } from '../../application/services/list-comments.service';
import { ListRepliesService } from '../../application/services/list-replies.service';
import { UpdateCommentService } from '../../application/services/update-comment.service';
import { ManageDiscussionService } from '../../application/services/manage-discussion.service';
import { DiscussionEngagementService } from '../../application/services/discussion-engagement.service';
import { z } from '../../../../common/zod/z';

const acceptDiscussionSchema = z.object({ replyId: z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid reply id.') });

@ApiTags('Comments')
@Controller('v1/comments')
export class CommentController {
  constructor(
    private readonly listCommentsSvc: ListCommentsService,
    private readonly listRepliesSvc: ListRepliesService,
    private readonly getCommentSvc: GetCommentService,
    private readonly createCommentSvc: CreateCommentService,
    private readonly updateCommentSvc: UpdateCommentService,
    private readonly deleteCommentSvc: DeleteCommentService,
    private readonly manageDiscussionSvc: ManageDiscussionService,
    private readonly discussionEngagementSvc: DiscussionEngagementService,
  ) {}

  @Get('moderation/queue')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('BearerAuth')
  async moderationQueue(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(moderationQueueSchema)) query: z.infer<typeof moderationQueueSchema>,
  ) {
    const result = await this.discussionEngagementSvc.listModerationQueue(user.id, user.role, query);
    return ApiResponse.success({
      message: 'Moderation queue fetched.',
      data: result.data,
      meta: result.meta,
    });
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('BearerAuth')
  @ApiOperation({ summary: 'UC29 - list comments by target.' })
  async listComments(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(listCommentsQuerySchema)) query: ListCommentsQueryDto,
  ) {
    const result = await this.listCommentsSvc.execute(
      user.id,
      user.role,
      query.targetType,
      query.targetId,
      query.page,
      query.limit,
      { postType: query.postType, questionStatus: query.questionStatus },
    );
    return ApiResponse.success({
      message: 'Comments fetched.',
      data: result.data,
      meta: { page: result.page, limit: result.limit, total: result.total, totalPages: result.totalPages, capabilities: result.capabilities },
    });
  }

  @Get(':commentId/replies')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('BearerAuth')
  @ApiOperation({ summary: 'UC30 - list replies of a comment.' })
  async listReplies(
    @CurrentUser() user: AuthenticatedUser,
    @Param('commentId', new ZodValidationPipe(commentIdParamSchema)) commentId: string,
  ) {
    const replies = await this.listRepliesSvc.execute(user.id, user.role, commentId);
    return ApiResponse.success({ message: 'Replies fetched.', data: replies });
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('BearerAuth')
  @ApiOperation({ summary: 'UC29 / UC30 - create comment or reply.' })
  async createComment(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createCommentSchema)) body: CreateCommentDto,
  ) {
    if (!user) throw new BadRequestError('User context required.');
    const data = await this.createCommentSvc.execute(user.id, user.role, body);
    return ApiResponse.success({ message: 'Comment created.', data, statusCode: 201 });
  }

  @Post(':commentId/replies')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('BearerAuth')
  @ApiOperation({ summary: 'UC30 - reply to a comment.' })
  async reply(
    @CurrentUser() user: AuthenticatedUser,
    @Param('commentId', new ZodValidationPipe(commentIdParamSchema)) commentId: string,
    @Body(new ZodValidationPipe(createReplySchema)) body: CreateReplyDto,
  ) {
    if (!user) throw new BadRequestError('User context required.');
    const parent = await this.getCommentSvc.execute(commentId);
    const data = await this.createCommentSvc.execute(user.id, user.role, {
      targetType: parent.targetType,
      targetId: parent.targetId,
      content: body.content,
      parentId: commentId,
      isAnonymous: body.isAnonymous ?? false,
      postType: body.postType === 'CODE_SOLUTION' ? 'CODE_SOLUTION' : 'GENERAL',
      codeShareId: body.codeShareId,
    });
    return ApiResponse.success({ message: 'Reply created.', data, statusCode: 201 });
  }

  @Patch(':commentId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('BearerAuth')
  @ApiOperation({ summary: 'UC31 - edit own comment (Admin override).' })
  async updateComment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('commentId', new ZodValidationPipe(commentIdParamSchema)) commentId: string,
    @Body(new ZodValidationPipe(updateCommentSchema)) body: UpdateCommentDto,
  ) {
    if (!user) throw new BadRequestError('User context required.');
    const data = await this.updateCommentSvc.execute(user.id, user.role, commentId, body.content);
    return ApiResponse.success({ message: 'Comment updated.', data });
  }

  @Delete(':commentId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('BearerAuth')
  @ApiOperation({ summary: 'UC32 - soft delete comment.' })
  async deleteComment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('commentId', new ZodValidationPipe(commentIdParamSchema)) commentId: string,
  ) {
    if (!user) throw new BadRequestError('User context required.');
    await this.deleteCommentSvc.execute(user.id, user.role, commentId);
    return ApiResponse.success({ message: 'Comment deleted.' });
  }

  @Patch(':commentId/accept')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('BearerAuth')
  async acceptSolution(
    @CurrentUser() user: AuthenticatedUser,
    @Param('commentId', new ZodValidationPipe(commentIdParamSchema)) commentId: string,
    @Body(new ZodValidationPipe(acceptDiscussionSchema)) body: z.infer<typeof acceptDiscussionSchema>,
  ) {
    const data = await this.manageDiscussionSvc.accept(user.id, user.role, commentId, body.replyId);
    return ApiResponse.success({ message: 'Solution accepted.', data });
  }

  @Patch(':commentId/close')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('BearerAuth')
  async closeDiscussion(@CurrentUser() user: AuthenticatedUser, @Param('commentId', new ZodValidationPipe(commentIdParamSchema)) commentId: string) {
    const data = await this.manageDiscussionSvc.setStatus(user.id, user.role, commentId, 'CLOSED');
    return ApiResponse.success({ message: 'Discussion closed.', data });
  }

  @Patch(':commentId/reopen')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('BearerAuth')
  async reopenDiscussion(@CurrentUser() user: AuthenticatedUser, @Param('commentId', new ZodValidationPipe(commentIdParamSchema)) commentId: string) {
    const data = await this.manageDiscussionSvc.setStatus(user.id, user.role, commentId, 'OPEN');
    return ApiResponse.success({ message: 'Discussion reopened.', data });
  }

  @Put(':commentId/helpful')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('BearerAuth')
  async toggleHelpful(@CurrentUser() user: AuthenticatedUser, @Param('commentId', new ZodValidationPipe(commentIdParamSchema)) commentId: string) {
    const data = await this.discussionEngagementSvc.toggleHelpful(user.id, user.role, commentId);
    return ApiResponse.success({ message: data.helpful ? 'Marked as helpful.' : 'Helpful mark removed.', data });
  }

  @Post(':commentId/reports')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('BearerAuth')
  async reportDiscussion(
    @CurrentUser() user: AuthenticatedUser,
    @Param('commentId', new ZodValidationPipe(commentIdParamSchema)) commentId: string,
    @Body(new ZodValidationPipe(reportDiscussionSchema)) body: z.infer<typeof reportDiscussionSchema>,
  ) {
    const data = await this.discussionEngagementSvc.report(user.id, user.role, commentId, body);
    return ApiResponse.success({ message: 'Discussion report submitted.', data, statusCode: 201 });
  }

  @Patch(':commentId/verify')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('BearerAuth')
  async verifyDiscussion(@CurrentUser() user: AuthenticatedUser, @Param('commentId', new ZodValidationPipe(commentIdParamSchema)) commentId: string) {
    const data = await this.discussionEngagementSvc.verify(user.id, user.role, commentId);
    return ApiResponse.success({ message: 'Discussion contribution verified.', data });
  }

  @Patch(':commentId/moderation')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('BearerAuth')
  async moderateDiscussion(
    @CurrentUser() user: AuthenticatedUser,
    @Param('commentId', new ZodValidationPipe(commentIdParamSchema)) commentId: string,
    @Body(new ZodValidationPipe(moderationSchema)) body: z.infer<typeof moderationSchema>,
  ) {
    const data = await this.discussionEngagementSvc.moderate(user.id, user.role, commentId, body);
    return ApiResponse.success({ message: 'Discussion moderation updated.', data });
  }
}

@ApiTags('Lessons')
@Controller('v1/lessons')
export class LessonCommentsController {
  constructor(
    private readonly listCommentsSvc: ListCommentsService,
    private readonly createCommentSvc: CreateCommentService,
  ) {}

  @Get(':id/comments')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('BearerAuth')
  async lessonComments(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ZodValidationPipe(commentIdParamSchema)) id: string,
    @Query(new ZodValidationPipe(listCommentsQuerySchema.omit({ targetType: true, targetId: true })))
    query: Pick<ListCommentsQueryDto, 'page' | 'limit'>,
  ) {
    const result = await this.listCommentsSvc.execute(
      user.id,
      user.role,
      'LESSON',
      id,
      query.page,
      query.limit,
    );
    return ApiResponse.success({
      message: 'Comments fetched.',
      data: result.data,
      meta: { page: result.page, limit: result.limit, total: result.total, totalPages: result.totalPages, capabilities: result.capabilities },
    });
  }

  @Post(':id/comments')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('BearerAuth')
  async createLessonComment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ZodValidationPipe(commentIdParamSchema)) id: string,
    @Body(new ZodValidationPipe(createLessonCommentSchema))
    body: Omit<CreateCommentDto, 'targetType' | 'targetId'>,
  ) {
    const comment = await this.createCommentSvc.execute(user.id, user.role, {
      targetType: 'LESSON',
      targetId: id,
      content: body.content,
      parentId: body.parentId,
      isAnonymous: body.isAnonymous,
      postType: body.postType,
      codeShareId: body.codeShareId,
    });
    return ApiResponse.success({ message: 'Comment created.', data: comment, statusCode: 201 });
  }
}
