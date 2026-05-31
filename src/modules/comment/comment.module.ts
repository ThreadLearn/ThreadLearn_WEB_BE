import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CommentController } from './controllers/comment.controller';
import { CommentService } from './services/comment.service';
import { CommentSchema } from './models/comment.model';
import { CourseSchema } from '../courses/models/course.model';
import { LessonSchema } from '../lessons/models/lesson.model';
import { EnrollmentSchema } from '../enrollments/models/enrollment.model';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Comment',    schema: CommentSchema },
      { name: 'Course',     schema: CourseSchema },
      { name: 'Lesson',     schema: LessonSchema },
      { name: 'Enrollment', schema: EnrollmentSchema },
    ]),
  ],
  controllers: [CommentController],
  providers:   [CommentService],
  exports:     [CommentService],
})
export class CommentModule {}
