import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CoursesController } from './controllers/courses.controller';
import { CoursesService } from './services/courses.service';
import { CourseSchema } from './models/course.model';
import { LessonSchema } from '../lessons/models/lesson.model';

@Module({
  imports: [MongooseModule.forFeature([{ name: 'Course', schema: CourseSchema }, { name: 'Lesson', schema: LessonSchema }])],
  controllers: [CoursesController],
  providers: [CoursesService],
  exports: [CoursesService],
})
export class CoursesModule {}
