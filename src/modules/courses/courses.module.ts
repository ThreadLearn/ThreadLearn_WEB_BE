import { Module } from '@nestjs/common';
import { CoursesController } from './controllers/courses.controller';
import { CoursesService } from './services/courses.service';

@Module({
  controllers: [CoursesController],
  providers: [CoursesService],
  exports: [CoursesService],
})
export class CoursesModule {}
