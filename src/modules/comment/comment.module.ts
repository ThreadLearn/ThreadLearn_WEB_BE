import { Module } from '@nestjs/common';
import { LearningAccessModule } from '../../shared/application/learning-access/learning-access.module';
import { CommentController, LessonCommentsController } from './controllers/comment.controller';
import { CommentService } from './services/comment.service';

@Module({
  imports: [LearningAccessModule],
  controllers: [CommentController, LessonCommentsController],
  providers: [CommentService],
})
export class CommentModule {}
