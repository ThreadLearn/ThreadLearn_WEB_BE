import { Module } from '@nestjs/common';
import { CreateCourseService } from './application/services/create-course.service';
import { DeleteCourseService } from './application/services/delete-course.service';
import { GetCourseDetailService } from './application/services/get-course-detail.service';
import { ListCoursesService } from './application/services/list-courses.service';
import { RestoreCourseService } from './application/services/restore-course.service';
import { SetCourseVisibilityService } from './application/services/set-course-visibility.service';
import { UpdateCourseService } from './application/services/update-course.service';
import { AssignCourseInstructorService } from './application/services/assign-course-instructor.service';
import { CourseInstructorAssignmentPolicy } from './application/services/course-instructor-assignment.policy';
import { CourseManagementPolicy } from './application/policies/course-management.policy';
import { ListMyInstructorCoursesService } from './application/services/list-my-instructor-courses.service';
import { CreateInstructorCourseService } from './application/services/create-instructor-course.service';
import { UpdateInstructorCourseService } from './application/services/update-instructor-course.service';
import { GetInstructorCourseDetailService } from './application/services/get-instructor-course-detail.service';
import { AuthModule } from '../auth/auth.module';
import { COURSE_CONTENT_PORT } from './domain/interfaces/course-content.port';
import { COURSE_REPOSITORY } from './domain/interfaces/course.repository';
import { MongoCourseContentAdapter } from './infrastructure/persistence/mongo-course-content.adapter';
import { MongoCourseRepository } from './infrastructure/persistence/mongo-course.repository';
import { CourseController } from './presentation/controller/course.controller';
import { AdminCourseOwnershipController, InstructorCoursesController } from './presentation/controller/course-ownership.controller';
import { InstructorCourseController } from './presentation/controller/instructor-course.controller';

@Module({
  imports: [AuthModule],
  controllers: [
    CourseController,
    AdminCourseOwnershipController,
    InstructorCoursesController,
    InstructorCourseController,
  ],
  providers: [
    MongoCourseRepository,
    MongoCourseContentAdapter,
    { provide: COURSE_REPOSITORY, useExisting: MongoCourseRepository },
    { provide: COURSE_CONTENT_PORT, useExisting: MongoCourseContentAdapter },
    ListCoursesService,
    GetCourseDetailService,
    CreateCourseService,
    UpdateCourseService,
    SetCourseVisibilityService,
    DeleteCourseService,
    RestoreCourseService,
    CourseInstructorAssignmentPolicy,
    CourseManagementPolicy,
    AssignCourseInstructorService,
    ListMyInstructorCoursesService,
    CreateInstructorCourseService,
    UpdateInstructorCourseService,
    GetInstructorCourseDetailService,
  ],
  exports: [
    COURSE_REPOSITORY,
    COURSE_CONTENT_PORT,
    CourseManagementPolicy,
    CreateInstructorCourseService,
    UpdateInstructorCourseService,
    GetInstructorCourseDetailService,
  ],
})
export class CourseModule {}
