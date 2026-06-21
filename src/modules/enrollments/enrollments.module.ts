import { Module } from '@nestjs/common';
import { LearningAccessModule } from '../../shared/application/learning-access/learning-access.module';
import { CompleteLessonService } from './application/services/complete-lesson.service';
import { EnrollInCourseService } from './application/services/enroll-in-course.service';
import { GetMyCourseEnrollmentService } from './application/services/get-my-course-enrollment.service';
import { GetMyResumeService } from './application/services/get-my-resume.service';
import { ListMyEnrollmentsService } from './application/services/list-my-enrollments.service';
import {
  EnrollmentsController,
  LessonCompletionController,
  StudentMeController,
} from './presentation/controller/enrollments.controller';
import { EnrollmentsService } from './services/enrollments.service';

@Module({
  imports: [LearningAccessModule],
  controllers: [EnrollmentsController, StudentMeController, LessonCompletionController],
  providers: [
    EnrollmentsService,
    EnrollInCourseService,
    ListMyEnrollmentsService,
    GetMyCourseEnrollmentService,
    GetMyResumeService,
    CompleteLessonService,
  ],
  exports: [EnrollmentsService],
})
export class EnrollmentsModule {}
