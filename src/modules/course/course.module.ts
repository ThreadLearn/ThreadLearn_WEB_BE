import { Module } from '@nestjs/common';
import { CreateCourseService } from './application/services/create-course.service';
import { DeleteCourseService } from './application/services/delete-course.service';
import { GetCourseDetailService } from './application/services/get-course-detail.service';
import { ListCoursesService } from './application/services/list-courses.service';
import { RestoreCourseService } from './application/services/restore-course.service';
import { SetCourseVisibilityService } from './application/services/set-course-visibility.service';
import { UpdateCourseService } from './application/services/update-course.service';
import { COURSE_CONTENT_PORT } from './domain/interfaces/course-content.port';
import { COURSE_REPOSITORY } from './domain/interfaces/course.repository';
import { MongoCourseContentAdapter } from './infrastructure/persistence/mongo-course-content.adapter';
import { MongoCourseRepository } from './infrastructure/persistence/mongo-course.repository';
import { CourseController } from './presentation/controller/course.controller';

@Module({
  controllers: [CourseController],
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
  ],
  exports: [COURSE_REPOSITORY, COURSE_CONTENT_PORT],
})
export class CourseModule {}
