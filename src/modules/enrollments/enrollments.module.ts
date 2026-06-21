import { Module } from '@nestjs/common';
import {
  EnrollmentsController,
  LessonCompletionController,
  StudentMeController,
} from './controllers/enrollments.controller';
import { EnrollmentsService } from './services/enrollments.service';

@Module({
  controllers: [EnrollmentsController, StudentMeController, LessonCompletionController],
  providers: [EnrollmentsService],
  exports: [EnrollmentsService],
})
export class EnrollmentsModule {}
