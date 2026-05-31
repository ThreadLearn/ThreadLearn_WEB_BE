import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LessonsController } from './controllers/lessons.controller';
import { LessonsService } from './services/lessons.service';
import { LessonSchema } from './models/lesson.model';

@Module({
  imports: [MongooseModule.forFeature([{ name: 'Lesson', schema: LessonSchema }])],
  controllers: [LessonsController],
  providers: [LessonsService],
  exports: [LessonsService],
})
export class LessonsModule {}
