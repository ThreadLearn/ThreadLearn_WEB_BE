import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CoursesController } from './controllers/courses.controller';
import { CoursesService } from './services/courses.service';
import { CourseSchema } from './models/course.model';
import { LessonSchema } from '../lessons/models/lesson.model';
import { EnrollmentSchema } from '../enrollments/models/enrollment.model';
import { BookmarkSchema }   from '../bookmark/models/bookmark.model';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Course',     schema: CourseSchema     },
      { name: 'Lesson',     schema: LessonSchema     },
      { name: 'Enrollment', schema: EnrollmentSchema },
      { name: 'Bookmark',   schema: BookmarkSchema },
    ]),
  ],
  controllers: [CoursesController],
  providers:   [CoursesService],
  exports:     [CoursesService],
})
export class CoursesModule {}
