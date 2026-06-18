import { Module } from '@nestjs/common';
import { EnrollmentsController, StudentMeController } from './controllers/enrollments.controller';
import { EnrollmentsService } from './services/enrollments.service';

@Module({
  controllers: [EnrollmentsController, StudentMeController],
  providers: [EnrollmentsService],
  exports: [EnrollmentsService],
})
export class EnrollmentsModule {}
