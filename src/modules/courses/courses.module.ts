import { Module } from '@nestjs/common';
import { CoursesController } from './controllers/courses.controller';
import { SectionsController } from './controllers/sections.controller';
import { CoursesService } from './services/courses.service';
import { CourseReviewsService } from './services/course-reviews.service';
import { SectionsService } from './services/sections.service';

@Module({
  controllers: [CoursesController, SectionsController],
  providers: [CoursesService, CourseReviewsService, SectionsService],
  exports: [CoursesService, CourseReviewsService, SectionsService],
})
export class CoursesModule {}
