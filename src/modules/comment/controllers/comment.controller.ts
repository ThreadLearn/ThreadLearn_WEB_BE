import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards, HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CommentService } from '../services/comment.service';
import { CreateCommentDto, UpdateCommentDto } from '../dto/comment.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../../../common/decorators/current-user.decorator';

@ApiTags('comments')
@Controller('comments')
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @Get()
  async getComments(
    @Query('targetType') targetType: 'COURSE' | 'LESSON',
    @Query('targetId')   targetId: string,
    @Query('page')       page  = '1',
    @Query('limit')      limit = '10',
  ) {
    const result = await this.commentService.getComments(
      targetType, targetId,
      parseInt(page, 10), Math.min(parseInt(limit, 10), 50),
    );
    return {
      message: 'Comments fetched.',
      data:    result.data,
      meta:    { total: result.total, page: result.page, limit: result.limit, hasMore: result.hasMore },
    };
  }

  @Get(':commentId/replies')
  async getReplies(@Param('commentId') commentId: string) {
    const data = await this.commentService.getReplies(commentId);
    return { message: 'Replies fetched.', data };
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STUDENT', 'ADMIN')
  @ApiBearerAuth()
  async createComment(@CurrentUser() user: JwtPayload, @Body() dto: CreateCommentDto) {
    const data = await this.commentService.createComment(user.id, dto, user.role);
    return { message: 'Comment created.', data, statusCode: 201 };
  }

  @Patch(':commentId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STUDENT', 'ADMIN')
  @ApiBearerAuth()
  async updateComment(
    @CurrentUser() user: JwtPayload,
    @Param('commentId') commentId: string,
    @Body() dto: UpdateCommentDto,
  ) {
    const data = await this.commentService.updateComment(commentId, user.id, dto.content, user.role);
    return { message: 'Comment updated.', data };
  }

  @Delete(':commentId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STUDENT', 'ADMIN')
  @ApiBearerAuth()
  @HttpCode(200)
  async deleteComment(
    @CurrentUser() user: JwtPayload,
    @Param('commentId') commentId: string,
  ) {
    await this.commentService.deleteComment(commentId, user.id, user.role);
    return { message: 'Comment deleted.' };
  }
}
