import { Module } from '@nestjs/common';
import { LearningAccessModule } from '../../shared/application/learning-access/learning-access.module';
import { CourseModule } from '../course/course.module';
import { LessonsModule } from '../lessons/lessons.module';
import { CompleteLessonService } from './application/services/complete-lesson.service';
import { EnrollInCourseService } from './application/services/enroll-in-course.service';
import { GetMyCourseEnrollmentService } from './application/services/get-my-course-enrollment.service';
import { GetMyResumeService } from './application/services/get-my-resume.service';
import { ListMyEnrollmentsService } from './application/services/list-my-enrollments.service';
import { ENROLLMENT_REPOSITORY } from './domain/interfaces/enrollment.repository';
import { LESSON_PROGRESS_REPOSITORY } from './domain/interfaces/lesson-progress.repository';
import { MongoEnrollmentRepository } from './infrastructure/persistence/mongo-enrollment.repository';
import { MongoLessonProgressRepository } from './infrastructure/persistence/mongo-lesson-progress.repository';
import {
  EnrollmentsController,
  LessonCompletionController,
  StudentMeController,
} from './presentation/controller/enrollments.controller';

@Module({
  imports: [LearningAccessModule, CourseModule, LessonsModule],
  controllers: [EnrollmentsController, StudentMeController, LessonCompletionController],
  providers: [
    MongoEnrollmentRepository,
    MongoLessonProgressRepository,
    { provide: ENROLLMENT_REPOSITORY, useExisting: MongoEnrollmentRepository },
    { provide: LESSON_PROGRESS_REPOSITORY, useExisting: MongoLessonProgressRepository },
    EnrollInCourseService,
    ListMyEnrollmentsService,
    GetMyCourseEnrollmentService,
    GetMyResumeService,
    CompleteLessonService,
  ],
  exports: [ENROLLMENT_REPOSITORY, EnrollInCourseService],
})
export class EnrollmentsModule {}
