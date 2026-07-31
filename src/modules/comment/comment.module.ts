import { Module } from '@nestjs/common';
import { LearningAccessModule } from '../../shared/application/learning-access/learning-access.module';
import { CodeShareModule } from '../code-share/code-share.module';
import { CreateCommentService } from './application/services/create-comment.service';
import { DeleteCommentService } from './application/services/delete-comment.service';
import { GetCommentService } from './application/services/get-comment.service';
import { ListCommentsService } from './application/services/list-comments.service';
import { ListRepliesService } from './application/services/list-replies.service';
import { UpdateCommentService } from './application/services/update-comment.service';
import { ManageDiscussionService } from './application/services/manage-discussion.service';
import { DiscussionEngagementService } from './application/services/discussion-engagement.service';
import { COMMENT_REPOSITORY } from './domain/interfaces/comment.repository';
import { MongoCommentRepository } from './infrastructure/persistence/mongo-comment.repository';
import { CommentController, LessonCommentsController } from './presentation/controller/comment.controller';

@Module({
  imports: [LearningAccessModule, CodeShareModule],
  controllers: [CommentController, LessonCommentsController],
  providers: [
    MongoCommentRepository,
    { provide: COMMENT_REPOSITORY, useExisting: MongoCommentRepository },
    ListCommentsService,
    ListRepliesService,
    GetCommentService,
    CreateCommentService,
    UpdateCommentService,
    DeleteCommentService,
    ManageDiscussionService,
    DiscussionEngagementService,
  ],
})
export class CommentModule {}
