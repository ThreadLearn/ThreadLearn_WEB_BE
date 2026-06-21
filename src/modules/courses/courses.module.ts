import { Module } from '@nestjs/common';
import { CourseLegacyController } from './controllers/course-legacy.controller';
import { SectionsController } from './controllers/sections.controller';
import { CoursesService } from './services/courses.service';
import { CourseReviewsService } from './services/course-reviews.service';
import { SectionsService } from './services/sections.service';

@Module({
  controllers: [CourseLegacyController, SectionsController],
  providers: [CoursesService, CourseReviewsService, SectionsService],
  exports: [CoursesService, CourseReviewsService, SectionsService],
})
export class CoursesModule {}
